// Text and brand normalization utilities

const BRAND_TYPO_MAP = new Map([
  ['rebook', 'reebok'],
  ['reebok', 'reebok'],
  ['adiddas', 'adidas'],
  ['adidsa', 'adidas'],
  ['nkie', 'nike'],
  ['nikey', 'nike'],
  ['samsang', 'samsung'],
  ['whirpool', 'whirlpool'],
  ['fridgidaire', 'frigidaire'],
  ['soni', 'sony'],
  ['colmbia', 'columbia'],
  ['patgonia', 'patagonia']
]);

function normalizeBrandTerms(input) {
  if (!input || typeof input !== 'string') return input;
  const words = input.split(/\s+/);
  const normalized = words.map((w) => {
    const key = w.toLowerCase();
    return BRAND_TYPO_MAP.get(key) || w;
  });
  return normalized.join(' ');
}

function normalizeSearchQuery(input) {
  return normalizeBrandTerms(input);
}

module.exports = {
  normalizeBrandTerms,
  normalizeSearchQuery
};


