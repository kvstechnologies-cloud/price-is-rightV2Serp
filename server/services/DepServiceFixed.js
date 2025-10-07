const mysql = require('mysql2/promise');

const DEFAULT_CATEGORY_NAME = process.env.DEP_DEFAULT_CATEGORY_NAME || '(Select)';
const CATEGORY_HINT_SIMILARITY_THRESHOLD = parseFloat(process.env.DEP_HINT_THRESHOLD || '0.6');

function normalize(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalize(text)
    .split(' ')
    .filter(Boolean);
}

function overlapScore(tokensA, tokensBSet) {
  let score = 0;
  const matched = [];
  for (const t of tokensA) {
    if (tokensBSet.has(t)) { score++; matched.push(t); }
  }
  return { score, matchedTokens: [...new Set(matched)] };
}

function startsWithMatchedToken(nameTokens, matchedTokensSet) {
  if (nameTokens.length === 0 || matchedTokensSet.size === 0) return false;
  return matchedTokensSet.has(nameTokens[0]);
}

function simpleSimilarity(a, b) {
  // Jaccard over 3-grams as simple similarity for hint matching
  const an = normalize(a);
  const bn = normalize(b);
  if (!an || !bn) return 0;
  const grams = s => new Set([...s].map((_, i) => s.substring(i, i + 3)).filter(g => g.length === 3));
  const ga = grams(an);
  const gb = grams(bn);
  let inter = 0;
  ga.forEach(g => { if (gb.has(g)) inter++; });
  const union = ga.size + gb.size - inter;
  return union === 0 ? 0 : inter / union;
}

class DepServiceFixed {
  constructor() {
    this.cache = null;
    this.connection = null;
  }

  async getConnection() {
    if (!this.connection) {
      try {
        this.connection = await mysql.createConnection({
          host: process.env.DB_HOST,
          port: process.env.DB_PORT || 3306,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME || 'price_is_right_admin'
        });
      } catch (err) {
        console.error('Failed to create database connection:', err.message);
        throw err;
      }
    }
    return this.connection;
  }

  async loadCache() {
    if (this.cache) return this.cache;
    
    try {
      const connection = await this.getConnection();
      const [rows] = await connection.execute('SELECT id, code, name, annual_depreciation_rate, useful_life, examples_text FROM dep_categories');
      
      this.cache = rows.map(r => ({
        id: r.id,
        code: r.code,
        name: r.name,
        nameNorm: normalize(r.name),
        depPercent: Number(r.annual_depreciation_rate),
        usefulLife: r.useful_life,
        examplesText: r.examples_text || '',
        examplesTokens: new Set(tokenize(r.examples_text || '')),
        nameTokens: tokenize(r.name)
      }));
      
      // Ensure default exists at runtime (non-persisted if absent)
      if (!this.cache.find(c => c.name === DEFAULT_CATEGORY_NAME)) {
        this.cache.push({ 
          id: 0, 
          code: null, 
          name: DEFAULT_CATEGORY_NAME, 
          nameNorm: normalize(DEFAULT_CATEGORY_NAME), 
          depPercent: 0, 
          usefulLife: '', 
          examplesText: '', 
          examplesTokens: new Set(), 
          nameTokens: tokenize(DEFAULT_CATEGORY_NAME) 
        });
      }
      
      return this.cache;
    } catch (err) {
      console.error('Failed to load cache:', err.message);
      // Return default cache on error
      return [{
        id: 0,
        code: null,
        name: DEFAULT_CATEGORY_NAME,
        nameNorm: normalize(DEFAULT_CATEGORY_NAME),
        depPercent: 0,
        usefulLife: '',
        examplesText: '',
        examplesTokens: new Set(),
        nameTokens: tokenize(DEFAULT_CATEGORY_NAME)
      }];
    }
  }

  async reload() {
    this.cache = null;
    await this.loadCache();
    return { reloaded: true, count: this.cache.length };
  }

  async inferDepCategory(input) {
    const { description, model, room, categoryHint, depCat, overrideDep, allowOverride } = input || {};
    const allow = allowOverride !== false;
    const cache = await this.loadCache();

    // Manual override
    if (allow && (overrideDep === true || (depCat && String(depCat).trim()))) {
      const existing = cache.find(c => normalize(c.name) === normalize(depCat));
      const depPercent = existing ? existing.depPercent : 0;
      return { depCat: depCat || DEFAULT_CATEGORY_NAME, depPercent, match: { strategy: 'manual_override' }, candidates: [] };
    }

    // Strategy a) category_hint
    if (categoryHint && String(categoryHint).trim()) {
      const hint = String(categoryHint).trim();
      // exact
      let best = null;
      for (const c of cache) {
        if (normalize(c.name) === normalize(hint)) { best = { c, sim: 1 }; break; }
      }
      // contains / startsWith / similarity
      if (!best) {
        let candidates = [];
        for (const c of cache) {
          const name = c.name;
          const nname = normalize(name);
          const nhint = normalize(hint);
          let sim = 0;
          if (nname.startsWith(nhint) || nhint.startsWith(nname) || nname.includes(nhint) || nhint.includes(nname)) {
            sim = 0.95;
          } else {
            sim = simpleSimilarity(name, hint);
          }
          candidates.push({ c, sim });
        }
        candidates.sort((a, b) => b.sim - a.sim);
        best = candidates[0];
        // Threshold
        if (!best || best.sim < CATEGORY_HINT_SIMILARITY_THRESHOLD) {
          return { depCat: DEFAULT_CATEGORY_NAME, depPercent: 0, match: { strategy: 'default' }, candidates: candidates.slice(0, 3).map(x => ({ name: x.c.name, score: x.sim, depPercent: x.c.depPercent })) };
        }
        return { depCat: best.c.name, depPercent: best.c.depPercent, match: { strategy: 'category_hint' }, candidates: candidates.slice(0, 3).map(x => ({ name: x.c.name, score: x.sim, depPercent: x.c.depPercent })) };
      } else {
        return { depCat: best.c.name, depPercent: best.c.depPercent, match: { strategy: 'category_hint' }, candidates: [{ name: best.c.name, score: best.sim, depPercent: best.c.depPercent }] };
      }
    }

    // Strategy b) examples_keyword
    const combined = [description, model, room].filter(Boolean).join(' ');
    const tokens = tokenize(combined);
    let scored = [];
    for (const c of cache) {
      if (c.name === DEFAULT_CATEGORY_NAME) continue;
      const { score, matchedTokens } = overlapScore(tokens, c.examplesTokens);
      if (score > 0) {
        const nameStarts = startsWithMatchedToken(c.nameTokens, new Set(matchedTokens));
        scored.push({ c, score, matchedTokens, nameStarts });
      }
    }
    if (scored.length === 0) {
      return { depCat: DEFAULT_CATEGORY_NAME, depPercent: 0, match: { strategy: 'default' }, candidates: [] };
    }
    scored.sort((a, b) => {
      // Tie-break 1: higher token overlap
      if (b.score !== a.score) return b.score - a.score;
      // Tie-break 2: prefer category whose name starts with matched token
      if (b.nameStarts !== a.nameStarts) return b.nameStarts ? 1 : -1;
      // Tie-break 3: lower depPercent
      return a.c.depPercent - b.c.depPercent;
    });
    
    const best = scored[0];
    const candidates = scored.slice(0, 3).map(x => ({ 
      name: x.c.name, 
      score: x.score, 
      depPercent: x.c.depPercent,
      matchedTokens: x.matchedTokens 
    }));
    
    return { 
      depCat: best.c.name, 
      depPercent: best.c.depPercent, 
      match: { strategy: 'examples_keyword', matchedTokens: best.matchedTokens }, 
      candidates 
    };
  }

  async applyDepreciation(items) {
    if (!Array.isArray(items)) {
      throw new Error('Items must be an array');
    }
    
    const results = [];
    for (const item of items) {
      try {
        const { itemId, totalReplacementPrice } = item;
        
        // Validate required fields
        if (!itemId) {
          results.push({ 
            itemId: 'unknown', 
            depCat: null, 
            depPercent: null, 
            depAmount: null, 
            match: { strategy: 'default' } 
          });
          continue;
        }
        
        if (typeof totalReplacementPrice !== 'number' || totalReplacementPrice < 0 || isNaN(totalReplacementPrice)) {
          results.push({ 
            itemId: String(itemId), 
            depCat: null, 
            depPercent: null, 
            depAmount: null, 
            match: { strategy: 'default' } 
          });
          continue;
        }
        
        const depCategory = await this.inferDepCategory(item);
        const depAmount = Math.round(totalReplacementPrice * depCategory.depPercent * 100) / 100;
        
        results.push({
          itemId: String(itemId),
          depCat: depCategory.depCat,
          depPercent: depCategory.depPercent,
          depAmount,
          match: depCategory.match,
          candidates: depCategory.candidates || []
        });
        
      } catch (err) {
        console.error(`Error processing item ${item.itemId}:`, err.message);
        results.push({ 
          itemId: String(item.itemId || 'unknown'), 
          depCat: DEFAULT_CATEGORY_NAME, 
          depPercent: 0, 
          depAmount: 0, 
          match: { strategy: 'default' } 
        });
      }
    }
    
    return results;
  }

  async close() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}

module.exports = DepServiceFixed;
