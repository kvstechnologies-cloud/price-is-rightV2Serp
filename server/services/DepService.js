const mysql = require('mysql2/promise');

const DEFAULT_CATEGORY_NAME = process.env.DEP_DEFAULT_CATEGORY_NAME || 'Empty';
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

class DepService {
  constructor() {
    this.cache = null;
  }

  async getDb() {
    if (!this.db) {
      try {
        this.db = await mysql.createConnection({
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
    return this.db;
  }

  async loadCache() {
    if (this.cache) return this.cache;
    const db = await this.getDb();
    const [rows] = await db.query('SELECT id, code, name, annual_depreciation_rate, useful_life, examples_text FROM dep_categories');
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
      this.cache.push({ id: 0, code: null, name: DEFAULT_CATEGORY_NAME, nameNorm: normalize(DEFAULT_CATEGORY_NAME), depPercent: 0, usefulLife: '', examplesText: '', examplesTokens: new Set(), nameTokens: tokenize(DEFAULT_CATEGORY_NAME) });
    }
    return this.cache;
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
      if (b.score !== a.score) return b.score - a.score; // 1) higher overlap
      if (a.nameStarts !== b.nameStarts) return (b.nameStarts ? 1 : 0) - (a.nameStarts ? 1 : 0); // 2) name starts with matched token
      if (a.c.depPercent !== b.c.depPercent) return a.c.depPercent - b.c.depPercent; // 3) lower depPercent
      return a.c.name.localeCompare(b.c.name);
    });
    const top = scored[0];
    const candidates = scored.slice(0, 3).map(x => ({ name: x.c.name, score: x.score, depPercent: x.c.depPercent }));
    return { depCat: top.c.name, depPercent: top.c.depPercent, match: { strategy: 'examples_keyword', matchedTokens: top.matchedTokens }, candidates };
  }

  async applyDepreciation(items) {
    const results = [];
    for (const item of items || []) {
      const { itemId, totalReplacementPrice } = item;
      const price = Number(totalReplacementPrice);
      if (!(typeof price === 'number') || isNaN(price) || price < 0) {
        results.push({ itemId, depCat: null, depPercent: null, depAmount: null, match: { strategy: 'default' }, candidates: [] });
        continue;
      }
      const inferred = await this.inferDepCategory(item);
      const depAmount = Math.round(price * inferred.depPercent * 100) / 100;
      results.push({ itemId, depCat: inferred.depCat, depPercent: inferred.depPercent, depAmount, match: inferred.match, candidates: inferred.candidates || [] });
    }
    return results;
  }
}

module.exports = new DepService();


