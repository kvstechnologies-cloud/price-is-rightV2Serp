const DEFAULT_CATEGORY_NAME = process.env.DEP_DEFAULT_CATEGORY_NAME || '';
const gpt5Config = require('../config/gpt5Config');
const { chatWithFallback } = require('../utils/openaiWrapper');

// Fallback categories in case database connection fails
const FALLBACK_CATEGORIES = [
  {
    id: 1,
    name: 'KCW - KITCHEN (STORAGE)',
    depPercent: 0.10,
    examples: ['cooler', 'beverage', 'storage', 'kitchen', 'lunch', 'stanley', 'canisters', 'silverware', 'pantry', 'mixer', 'mixers', 'blender', 'blenders', 'ninja', 'cuisinart', 'cookware', 'utensil', 'aprons', 'apron', 'dish', 'plate', 'cup', 'mug', 'glass', 'bowl', 'pan', 'pot', 'knife', 'fork', 'spoon', 'container', 'jar', 'bottle', 'thermos', 'lunchbox', 'kitchen', 'cooking', 'baking', 'prep', 'crockpot', 'slow cooker', 'waffle', 'waffle iron', 'toaster', 'coffee maker', 'microwave', 'oven', 'stove', 'range', 'refrigerator', 'freezer', 'dishwasher', 'sink', 'faucet', 'cabinet', 'drawer', 'shelf', 'rack', 'organizer', 'towel', 'rag', 'sponge', 'brush', 'cleaner', 'detergent', 'soap', 'trash', 'garbage', 'recycle', 'bin', 'basket', 'tray', 'serving', 'dining']
  },
  {
    id: 2,
    name: 'ELC - ELECTRONICS B',
    depPercent: 0.20,
    examples: ['electronics', 'metal', 'electrical', 'wiring', 'circuit', 'tv', 'television', '4k', 'uhd', 'hd', 'remote', 'laptop', 'energizer','computer', 'pc', 'monitor', 'screen', 'tablet', 'iphone', 'android', 'camera', 'speaker', 'soundbar', 'bose', 'sony', 'headphone', 'headphones', 'earbuds', 'earphones', 'gaming', 'console', 'xbox', 'playstation', 'ps5', 'nintendo', 'charger', 'cables', 'wire', 'battery', 'power', 'digital', 'smart', 'device', 'gadget', 'bluetooth', 'wireless', 'audio', 'sound']
  },
  {
    id: 3,
    name: 'LIN - BEDDING II',
    depPercent: 0.05,
    examples: ['mattress', 'bedding', 'bed', 'sleep', 'furniture', 'fabric', 'textile', 'mat','sheet', 'pillow', 'blanket', 'comforter', 'duvet', 'quilt', 'bedspread', 'boxspring', 'bedframe', 'headboard', 'footboard', 'nightstand', 'dresser', 'wardrobe', 'closet', 'bedroom', 'sleeping', 'rest', 'comfort', 'soft', 'cushion', 'support', 'down', 'feather', 'cotton', 'linen', 'wool', 'silk', 'polyester', 'memory', 'foam', 'innerspring', 'hybrid']
  },
  {
    id: 4,
    name: 'SPG - SPORTING GOODS',
    depPercent: 0.10,
    examples: ['sporting', 'outdoor', 'camping', 'helmet', 'tents', 'sleeping', 'bags', 'equipment', 'exercise', 'fitness', 'gym', 'workout', 'sports', 'game', 'play', 'recreation', 'hobby', 'bicycle', 'bike', 'treadmill', 'weights', 'dumbbell', 'yoga', 'mat', 'ball', 'racket', 'club', 'gear', 'athletic', 'active', 'movement', 'training', 'cardio', 'strength', 'flexibility', 'balance', 'endurance']
  },
  {
    id: 5,
    name: 'FRN - FURNITURE',
    depPercent: 0.10,
    examples: ['furniture', 'wood', 'metal', 'plastic', 'fabric', 'rattan', 'wicker', 'chair', 'chairs', 'table', 'tables', 'desk', 'sofa', 'couch', 'loveseat', 'ottoman', 'coffee', 'dining', 'office', 'work', 'study', 'living', 'family', 'room', 'home', 'house', 'apartment', 'decor', 'decoration', 'style', 'design', 'modern', 'traditional', 'classic', 'contemporary', 'leather', 'recliner', 'drawer', 'cabinet', 'shelf', 'bookcase', 'entertainment', 'center', 'console', 'side', 'end', 'accent', 'occasional', 'sectional', 'bed', 'bedroom', 'dresser', 'nightstand', 'headboard', 'footboard', 'bench', 'stool', 'barstool', 'credenza', 'armoire', 'wardrobe', 'chest', 'mirror', 'lamp', 'lamps', 'lighting', 'rug', 'carpet', 'curtain', 'blind', 'shade', 'pillow', 'cushion', 'throw', 'blanket', 'comforter', 'duvet', 'quilt', 'bedspread', 'mattress', 'boxspring', 'bedframe', 'crib', 'bunkbed', 'trundle', 'futon', 'daybed', 'platform', 'canopy', 'fourposter', 'sleigh', 'poster', 'twin', 'full', 'queen', 'king', 'california', 'eastern', 'western', 'out door', 'outdoor', 'electric', 'aluminum', 'entry', 'mat', 'decoration', 'decorative', 'heater', 'extension', 'cord']

  },
  {
    id: 6,
    name: 'APM - APPLIANCES (MAJOR)',
    depPercent: 0.05,
    examples: ['appliance', 'refrigerator', 'freezer', 'stove', 'range', 'major', 'kitchen', 'washer', 'dryer', 'dishwasher', 'microwave', 'oven', 'cooktop', 'hood', 'vent', 'fan', 'air', 'conditioner', 'heater', 'furnace', 'boiler', 'water', 'heater', 'garbage', 'disposal', 'trash', 'compactor', 'large', 'major', 'essential', 'household', 'home', 'domestic', 'laundry', 'cleaning', 'maintenance', 'vacuum', 'vacuum cleaner', 'iron', 'ironing', 'steam', 'press', 'machine']
  },
  {
    id: 7,
    name: 'LGP - OUTDOOR/PATIO',
    depPercent: 0.20,
    examples: ['outdoor', 'patio', 'garden', 'polycast', 'hose', 'sprinkler', 'flag', 'plant', 'flower', 'lamp', 'lamps', 'light', 'lights', 'lighting', 'electrical', 'string', 'led', 'fairy', 'star', 'copper', 'wire', 'exterior', 'outside', 'external', 'landscape', 'landscaping', 'deck', 'porch', 'balcony', 'terrace', 'walkway', 'path', 'driveway', 'fence', 'gate', 'shed', 'garage', 'pool', 'spa', 'hot', 'tub', 'illumination', 'fixture', 'bulb', 'lantern', 'torch', 'spotlight', 'floodlight', 'pathlight', 'wall', 'mounted', 'post', 'mounted', 'hanging', 'ceiling', 'ground', 'buried']

    
  },
  {
    id: 8,
    name: 'PER - FOOD',
    depPercent: 0.00,
    examples: ['food', 'beverage', 'alcohol', 'consumable', 'perishable', 'drink', 'snack', 'candy', 'chocolate', 'soda', 'juice', 'milk', 'water', 'beer', 'wine', 'liquor', 'spirit', 'cigarette', 'tobacco', 'medicine', 'vitamin', 'supplement', 'pill', 'tablet', 'capsule', 'powder', 'liquid', 'cream', 'lotion', 'soap', 'shampoo', 'toothpaste', 'cosmetic', 'makeup', 'coffee', 'tea', 'beans', 'grain', 'cereal', 'pasta', 'rice', 'flour', 'sugar', 'salt', 'spice', 'herb', 'oil', 'vinegar', 'sauce', 'condiment', 'vitamins', 'supplements', 'health', 'wellness', 'nutrition', 'dietary']
  },
  {
    id: 9,
    name: 'TLS - TOOLS & HARDWARE',
    depPercent: 0.15,
    examples: ['tool', 'tools', 'trolley', 'hammer', 'hardware', 'aerosol', 'tank', 'sledgehammer', 'lock', 'pliers', 'rust', 'lubricant', 'screwdriver', 'hammer', 'wrench', 'saw', 'drill', 'paint', 'brush', 'roller', 'tape', 'measure', 'level', 'clamp', 'vise', 'file', 'chisel', 'plane', 'router', 'sander', 'grinder', 'cutter', 'shears', 'scissors', 'knife', 'blade', 'bit', 'socket', 'ratchet', 'extension', 'cord', 'wire', 'pipe', 'fitting', 'valve', 'faucet', 'sink', 'toilet', 'shower', 'bath', 'mirror', 'cabinet', 'shelf', 'rack', 'bin', 'container', 'storage', 'organizer', 'basket', 'tote', 'box', 'case', 'bag', 'backpack', 'knapsack', 'suitcase', 'luggage', 'travel', 'work', 'construction', 'maintenance', 'repair', 'installation', 'electrical', 'plumbing', 'carpentry', 'masonry', 'painting', 'landscaping', 'gardening', 'automotive', 'mechanical', 'industrial', 'commercial', 'residential']
  },
    {
      id: 10,
      name: 'CLT - CLOTHING & ACCESSORIES',
      depPercent: 0.25,
      examples: ['clothing', 'clothes', 'shirt', 'shirts', 'tshirt', 'nylon', 'pouch', 't-shirts', 'tee', 'undershirt', 'undershirts', 'pants', 'jeans', 'shorts', 'dress', 'dresses', 'skirt', 'skirts', 'blouse', 'sweater', 'jacket', 'coat', 'suit', 'vest', 'tie', 'bow', 'scarf', 'hat', 'cap', 'beanie', 'boot', 'boots', 'shoes', 'sneakers', 'slippers', 'sandal', 'heels', 'pumps', 'loafers', 'oxfords', 'athletic', 'casual', 'formal', 'business', 'work', 'sport', 'outdoor', 'winter', 'summer', 'spring', 'fall', 'underwear', 'bra', 'panties', 'boxers', 'briefs', 'socks', 'stockings', 'tights', 'leggings', 'apron', 'aprons', 'jewelry', 'necklace', 'bracelet', 'ring', 'earring', 'watch', 'belt', 'wallet', 'purse', 'handbag', 'tote', 'backpack', 'bag', 'accessory', 'accessories', 'fashion', 'style', 'designer', 'mens', 'womens', 'kids', 'children', 'teen', 'adult', 'unisex']
    },
    {
      id: 11,
      name: 'ARC - ART',
      depPercent: 0.05,
      examples: ['art', 'artwork', 'painting', 'drawing', 'print', 'photograph', 'sculpture', 'collectible', 'antique', 'decorative', 'wall', 'hanging', 'framed', 'canvas', 'metal', 'wood', 'ceramic', 'glass', 'pottery', 'vase', 'figurine', 'object', 'supplies', 'easel', 'frame', 'matting', 'storage', 'decor', 'poster', 'watercolor', 'plastic', 'wall decor']
    },
    {
      id: 12,
      name: 'OFS - OFFICE SUPPLIES',
      depPercent: 0.10,
      examples: ['office', 'supply', 'stationery', 'paper', 'pen', 'pencil', 'marker', 'highlighter', 'notebook', 'binder', 'folder', 'stapler', 'clip', 'rubber band', 'tape', 'glue', 'scissor', 'ruler', 'calculator', 'organizer', 'cabinet', 'desk', 'accessory']
    },
    {
      id: 13,
      name: 'PCB - MISC',
      depPercent: 0.10,
      examples: ['miscellaneous', 'general', 'merchandise', 'platform', 'truck', 'cart', 'dolly', 'hand truck', 'utility', 'storage', 'container', 'bin', 'box', 'equipment', 'misc']
    },
    {
      id: 14,
      name: 'HSW - FRAMES & ALBUMS',
      depPercent: 0.05,
      examples: ['photo', 'frame', 'picture', 'album', 'scrapbook', 'storage', 'memory', 'book', 'collection', 'decorative', 'wall', 'table', 'digital', 'display']
    }
];

// Database connection function
async function getDatabaseCategories() {
  try {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'insurance_pricing'
    });

    const [rows] = await connection.execute(
      'SELECT id, name, annual_depreciation_rate as depPercent, examples_text as examples FROM dep_categories ORDER BY name'
    );
    
    await connection.end();
    
    // Transform database rows to match our expected format
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      depPercent: parseFloat(row.depPercent) / 100, // Convert percentage to decimal
      examples: row.examples ? row.examples.split(',').map(e => e.trim().toLowerCase()) : []
    }));
  } catch (error) {
    console.warn('⚠️ Failed to load categories from database, using fallback:', error.message);
    return FALLBACK_CATEGORIES;
  }
}

function normalize(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  const whitelist = new Set(['tv', '4k', 'hd', 'uhd', 'ac', 'dc', 'out', 'door']);
  return normalize(text)
    .split(' ')
    .filter(word => word && (word.length > 2 || whitelist.has(word)));
}

function overlapScore(tokensA, tokensBSet) {
  let score = 0;
  const matched = [];
  for (const t of tokensA) {
    if (tokensBSet.has(t)) { 
      score++; 
      matched.push(t); 
    }
  }
  return { score, matchedTokens: [...new Set(matched)] };
}

class DepServiceSimple {
  constructor() {
    console.log('🔧 DepServiceSimple constructor called');
    this.cache = [];
    this.aiHintCache = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return this.cache;
    }

    try {
      console.log('🔧 Loading categories from database...');
      this.cache = await getDatabaseCategories();
      
      // Add default category
      this.cache.push({ 
        id: 0, 
        name: DEFAULT_CATEGORY_NAME, 
        depPercent: 0, 
        examples: [], 
        examplesTokens: new Set(), 
        nameTokens: [] 
      });

      // Process categories for tokenization
      this.cache = this.cache.map(cat => ({
        ...cat,
        examplesTokens: new Set(cat.examples),
        nameTokens: tokenize(cat.name)
      }));

      this.initialized = true;
      console.log(`🔧 DepServiceSimple initialized with ${this.cache.length} categories from database`);
      console.log('🔧 Cache categories:', this.cache.map(c => ({ name: c.name, depPercent: c.depPercent })));
    } catch (error) {
      console.error('❌ Failed to initialize DepServiceSimple:', error);
      // Use fallback categories
      this.cache = FALLBACK_CATEGORIES.map(cat => ({
        ...cat,
        examplesTokens: new Set(cat.examples),
        nameTokens: tokenize(cat.name)
      }));
      this.cache.push({ 
        id: 0, 
        name: DEFAULT_CATEGORY_NAME, 
        depPercent: 0, 
        examples: [], 
        examplesTokens: new Set(), 
        nameTokens: [] 
      });
      this.initialized = true;
      console.log(`🔧 DepServiceSimple initialized with ${this.cache.length} fallback categories`);
    }
  }

  async loadCache() {
    await this.initialize();
    return this.cache;
  }

  async reload() {
    this.initialized = false;
    this.aiHintCache.clear();
    await this.initialize();
    return { reloaded: true, count: this.cache.length };
  }

  /**
   * AI-powered categorization - PRIMARY METHOD
   * This replaces the keyword matching approach and works like a human manually selecting categories
   */
  async categorizeWithAI(description, brand = '', productModel = '') {
    try {
      await this.initialize();
      
      const key = normalize(`${description} ${brand} ${productModel}`.trim());
      if (this.aiHintCache.has(key)) {
        return this.aiHintCache.get(key);
      }

      const textModelName = gpt5Config.getTextModel();
      const categoryList = this.cache
        .filter(c => c.name !== DEFAULT_CATEGORY_NAME)
        .map(c => `${c.name} (${c.depPercent * 100}%)`)
        .join('\n');

      const prompt = `You are an expert insurance claims adjuster. Categorize this product into the most appropriate depreciation category from the provided list.

PRODUCT INFORMATION:
Description: "${description}"
Brand: "${brand || 'Not specified'}"
Model: "${productModel || 'Not specified'}"

AVAILABLE CATEGORIES:
${categoryList}

CATEGORIZATION RULES:
- Use the exact category name from the list above
- Consider the product description, brand, and model carefully
- For kitchen storage items like Tupperware, containers, etc., look for appropriate kitchen/storage categories
- For cleaning supplies, look for household/cleaning categories
- For tools and hardware, look for tool categories
- For books, look for book categories
- For clothing, look for apparel categories
- For electronics, look for electronics categories
- For furniture, look for furniture categories
- For outdoor items, look for outdoor/patio categories
- Return ONLY the exact category name from the list above, no other text or explanations.

CATEGORY:`;

      const { response } = await chatWithFallback({
        model: textModelName,
        messages: [
          {
            role: 'system',
            content: 'You are an insurance claims categorization expert. Return only the exact category name from the provided list, no other text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 100
      });

      const content = response.choices?.[0]?.message?.content || '';
      const aiCategory = content.trim();

      // Clean up the AI response - extract just the category name if it includes percentage
      let cleanCategory = aiCategory;
      if (aiCategory.includes('(') && aiCategory.includes('%')) {
        // Extract category name before the percentage part
        cleanCategory = aiCategory.split('(')[0].trim();
      }

      // Validate against known categories
      const match = this.cache.find(c => normalize(c.name) === normalize(cleanCategory));
      if (!match) {
        console.warn(`⚠️ AI returned invalid category: "${aiCategory}" (cleaned: "${cleanCategory}") for "${description}"`);
        return null;
      }

      const result = {
        depCat: match.name,
        depPercent: match.depPercent,
        match: { strategy: 'ai_categorization', confidence: 'high' },
        candidates: []
      };

      this.aiHintCache.set(key, result);
      console.log(`🤖 AI categorized "${description}" → ${match.name} (${match.depPercent * 100}%)`);
      return result;

    } catch (err) {
      console.warn('⚠️ AI categorization failed:', err.message);
      return null;
    }
  }

  /**
   * AI fallback to suggest a depreciation category when keyword match fails
   */
  async aiSuggestCategory(text) {
    // PERFORMANCE OPTIMIZATION: Disable AI hints by default for speed
    // Set DEP_AI_HINTS_ENABLED=true in environment to enable
    if (process.env.DEP_AI_HINTS_ENABLED !== 'true') {
      return null;
    }

    try {
      await this.initialize();
      const key = normalize(text);
      if (this.aiHintCache.has(key)) {
        return this.aiHintCache.get(key);
      }

      const textModelName = gpt5Config.getTextModel();
      const categoryList = this.cache.filter(c => c.name !== DEFAULT_CATEGORY_NAME).map(c => c.name).join(', ');
      const messages = [
        { role: 'system', content: 'You map items to ONE depreciation category from the provided list. Return JSON only.' },
        { role: 'user', content: `Categories: ${categoryList}\nItem: ${text}\nRespond as JSON: {"name":"<exact category name>","confidence":0..1,"tokens":["keyword1", "keyword2"]}` }
      ];

      const { response } = await chatWithFallback({
        model: textModelName,
        messages,
        max_completion_tokens: 64,
        temperature: 0
      });

      const content = response.choices?.[0]?.message?.content || '';
      let parsed = null;
      try { parsed = JSON.parse(content); } catch (_) { /* ignore */ }
      if (!parsed || !parsed.name) return null;

      // Validate against known categories
      const match = this.cache.find(c => normalize(c.name) === normalize(parsed.name));
      if (!match) return null;

      const hint = {
        depCat: match.name,
        depPercent: match.depPercent,
        match: { strategy: 'ai_hint', matchedTokens: Array.isArray(parsed.tokens) ? parsed.tokens : [], confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined },
        candidates: []
      };
      this.aiHintCache.set(key, hint);
      return hint;
    } catch (err) {
      console.warn('⚠️ AI hint failed:', err.message);
      return null;
    }
  }

  async inferDepCategory(input) {
    await this.initialize();
    
    const { description, model, room, categoryHint, depCat, overrideDep, allowOverride } = input || {};
    const allow = allowOverride !== false;
    const cache = this.cache;

    // Manual override
    if (allow && (overrideDep === true || (depCat && String(depCat).trim()))) {
      const existing = cache.find(c => normalize(c.name) === normalize(depCat));
      const depPercent = existing ? existing.depPercent : 0;
      return { depCat: depCat || DEFAULT_CATEGORY_NAME, depPercent, match: { strategy: 'manual_override' }, candidates: [] };
    }

    // Strategy a) category_hint
    if (categoryHint && String(categoryHint).trim()) {
      const hint = String(categoryHint).trim();
      // exact match
      let best = null;
      for (const c of cache) {
        if (normalize(c.name) === normalize(hint)) { 
          best = { c, sim: 1 }; 
          break; 
        }
      }
      
      if (best) {
        return { 
          depCat: best.c.name, 
          depPercent: best.c.depPercent, 
          match: { strategy: 'category_hint' }, 
          candidates: [{ name: best.c.name, score: best.sim, depPercent: best.c.depPercent }] 
        };
      }
    }

    // Strategy b) AI-POWERED CATEGORIZATION (PRIMARY METHOD)
    if (description) {
      const aiResult = await this.categorizeWithAI(description, input.brand, model);
      if (aiResult) {
        return aiResult;
      }
    }

    // Strategy c) examples_keyword (fallback)
    const combined = [description, model, room].filter(Boolean).join(' ');
    const tokens = tokenize(combined);
    let scored = [];
    
    for (const c of cache) {
      if (c.name === DEFAULT_CATEGORY_NAME) continue;
      
      const { score, matchedTokens } = overlapScore(tokens, c.examplesTokens);
      if (score > 0) {
        const nameStarts = c.nameTokens.length > 0 && matchedTokens.includes(c.nameTokens[0]);
        scored.push({ c, score, matchedTokens, nameStarts });
      }
    }
    
    if (scored.length === 0) {
      return { depCat: DEFAULT_CATEGORY_NAME, depPercent: 0, match: { strategy: 'default' }, candidates: [] };
    }
    
    // Sort by score, then by name starting with matched token, then by lower depPercent
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.nameStarts !== a.nameStarts) return b.nameStarts ? 1 : -1;
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
    await this.initialize();
    
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
        
        let depCategory = await this.inferDepCategory(item);

        // AI fallback if default
        if ((depCategory.depCat === DEFAULT_CATEGORY_NAME || depCategory.depPercent === 0) && (item.description || item.model)) {
          const aiHint = await this.aiSuggestCategory(item.description || item.model || '');
          if (aiHint) {
            depCategory = aiHint;
          }
        }
        // Fix: depPercent is already in decimal form (0.05 for 5%), so calculate correctly
        console.log(`🔍 DEPRECIATION DEBUG - Item: ${itemId}, Price: ${totalReplacementPrice}, Category: ${depCategory.depCat}, Percent: ${depCategory.depPercent} (${typeof depCategory.depPercent})`);
        const depAmount = Math.round(totalReplacementPrice * depCategory.depPercent * 100) / 100;
        console.log(`🔍 DEPRECIATION DEBUG - Calculated Amount: ${depAmount}`);
        
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
}

module.exports = new DepServiceSimple();
