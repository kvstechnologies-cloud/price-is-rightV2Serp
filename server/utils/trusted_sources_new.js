// utils/trusted_sources_new.js - Trusted Sources Configuration

// TRUSTED_DOMAINS configuration as specified in requirements
const TRUSTED_DOMAINS = [
  'amazon.com',
  'walmart.com', 
  'target.com',
  'homedepot.com',
  'lowes.com',
  'bestbuy.com',
  'costco.com',
  'samsclub.com',
  'rei.com',
  'staples.com',
  'officedepot.com',
  'acehardware.com'
];

// Extended trusted sources with variations and subdomains
const TRUSTED_SOURCE_PATTERNS = [
  // Amazon variations
  /^(www\.)?amazon\.com$/i,
  /^(www\.)?amazon\.(ca|uk|de|fr|it|es|jp|au)$/i,
  
  // Walmart variations
  /^(www\.)?walmart\.com$/i,
  /^(www\.)?walmart\.(ca|com\.mx)$/i,
  
  // Target variations
  /^(www\.)?target\.com$/i,
  
  // Home Depot variations
  /^(www\.)?homedepot\.com$/i,
  /^(www\.)?homedepot\.(ca|com\.mx)$/i,
  
  // Lowe's variations
  /^(www\.)?lowes\.com$/i,
  /^(www\.)?lowes\.(ca|com\.mx)$/i,
  
  // Best Buy variations
  /^(www\.)?bestbuy\.com$/i,
  /^(www\.)?bestbuy\.(ca|com\.mx)$/i,
  
  // Costco variations
  /^(www\.)?costco\.com$/i,
  /^(www\.)?costco\.(ca|com\.mx|co\.jp)$/i,
  
  // Sam's Club variations
  /^(www\.)?samsclub\.com$/i,
  
  // REI variations
  /^(www\.)?rei\.com$/i,
  
  // Staples variations
  /^(www\.)?staples\.com$/i,
  /^(www\.)?staples\.(ca|com\.mx)$/i,
  
  // Office Depot variations
  /^(www\.)?officedepot\.com$/i,
  
  // Ace Hardware variations
  /^(www\.)?acehardware\.com$/i
];

/**
 * Check if a source/domain is trusted (block-only approach for better success rate)
 */
function isTrustedSource(source) {
  if (!source || typeof source !== 'string') {
    return false;
  }

  const sourceLower = source.toLowerCase().trim();
  
  // BLOCK: Only reject known problematic sources
  const blockedSources = [
    // Marketplace/auction sites - ULTRA AGGRESSIVE BLOCKING
    'ebay', 'ebay.com', 'ebay.co.uk', 'ebay.ca', 'ebay.de', 'ebay.fr', 'ebay.it', 'ebay.es', 
    'ebay -', 'ebay.', 'ebay ', ' ebay', 'ebay seller', 'ebay store', 'ebay auction',
    'etsy', 'facebook marketplace', 'craigslist', 'offerup', 'letgo',
    'mercari', 'poshmark', 'whatnot', 'whatnot.com', 'whatnot -', 'whatnot.', 'whatnot ', ' whatnot', 'depop', 'vinted', 'grailed',
    
    // Questionable/cheap sites
    'wish', 'dhgate', 'temu', 'aliexpress', 'alibaba', 'fruugo',
    'bigbigmart', 'martexplore', 'directsupply', 'orbixis',
    
    // Social media
    'facebook', 'instagram', 'tiktok', 'twitter', 'reddit',
    
    // Food delivery (not relevant for products)
    'doordash', 'ubereats', 'grubhub', 'postmates',
    
    // Generic search engines (not product sites)
    'google.com/search', 'bing.com/search', 'yahoo.com/search',
    
    // Obvious spam/fake sites
    'spam', 'fake', 'scam', 'phishing'
  ];
  
  // Check if source contains any blocked keywords
  for (const blocked of blockedSources) {
    if (sourceLower.includes(blocked)) {
      console.log(`❌ BLOCKED SOURCE: ${source} (contains: ${blocked})`);
      return false;
    }
  }
  
  // DEBUG: Log what sources are being allowed to identify why eBay gets through
  console.log(`🔍 SOURCE ANALYSIS: "${source}" → sourceLower: "${sourceLower}" → ALLOWED`);
  
  // Allow everything else
  console.log(`✅ ALLOWED SOURCE: ${source}`);
  return true;
}

/**
 * Extract clean retailer name from source
 */
function extractRetailerName(source) {
  if (!source || typeof source !== 'string') {
    return 'Unknown Retailer';
  }

  const sourceLower = source.toLowerCase().trim();
  
  // Clean up source to show only main retailer
  let cleanSource = source
    .replace(/\s*-\s*.*$/, '') // Remove everything after "-"
    .replace(/\s*Seller.*$/, '') // Remove "Seller" suffix
    .replace(/\s*FUHKJ Trade Co\.ltd.*$/, '') // Remove specific seller names
    .replace(/\s*WynBing.*$/, '') // Remove specific seller names
    .replace(/\s*AI.*$/, '') // Remove any AI-related text
    .replace(/\s*Estimated.*$/, '') // Remove any "Estimated" text
    .trim();
  
  // Map common variations to clean names
  const retailerMap = {
    'amazon.com': 'Amazon',
    'amazon': 'Amazon',
    'walmart.com': 'Walmart',
    'walmart': 'Walmart',
    'target.com': 'Target',
    'target': 'Target',
    'homedepot.com': 'Home Depot',
    'homedepot': 'Home Depot',
    'home depot': 'Home Depot',
    'lowes.com': 'Lowes',
    'lowes': 'Lowes',
    'lowe\'s': 'Lowes',
    'bestbuy.com': 'Best Buy',
    'bestbuy': 'Best Buy',
    'best buy': 'Best Buy',
    'wayfair.com': 'Wayfair',
    'wayfair': 'Wayfair',
    'costco.com': 'Costco',
    'costco': 'Costco',
    'samsclub.com': 'Sam\'s Club',
    'samsclub': 'Sam\'s Club',
    'sam\'s club': 'Sam\'s Club',
    'rei.com': 'REI',
    'rei': 'REI',
    'staples.com': 'Staples',
    'staples': 'Staples',
    'officedepot.com': 'Office Depot',
    'officedepot': 'Office Depot',
    'office depot': 'Office Depot',
    'acehardware.com': 'Ace Hardware',
    'acehardware': 'Ace Hardware',
    'ace hardware': 'Ace Hardware'
  };
  
  // Check for exact matches first
  if (retailerMap[sourceLower]) {
    return retailerMap[sourceLower];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(retailerMap)) {
    if (sourceLower.includes(key)) {
      return value;
    }
  }
  
  // If we can't identify a specific retailer, return a cleaned version
  if (cleanSource && cleanSource.length > 0) {
    // Capitalize first letter of each word
    return cleanSource.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return 'Market Search';
}

/**
 * Get trusted domain from source
 */
function getTrustedDomain(source) {
  if (!isTrustedSource(source)) {
    return null;
  }
  
  const sourceLower = source.toLowerCase();
  
  for (const domain of TRUSTED_DOMAINS) {
    if (sourceLower.includes(domain)) {
      return domain;
    }
  }
  
  return null;
}

/**
 * Filter results to only trusted sources
 */
function filterTrustedResults(results) {
  if (!Array.isArray(results)) {
    return [];
  }
  
  return results.filter(result => {
    const source = result.source || result.merchant || '';
    return isTrustedSource(source);
  });
}

/**
 * Validate and clean source information
 */
function validateSource(source) {
  if (!source || typeof source !== 'string') {
    return {
      isValid: false,
      isTrusted: false,
      cleanName: 'Unknown',
      domain: null
    };
  }
  
  const isTrusted = isTrustedSource(source);
  const cleanName = extractRetailerName(source);
  const domain = getTrustedDomain(source);
  
  return {
    isValid: true,
    isTrusted,
    cleanName,
    domain,
    originalSource: source
  };
}

/**
 * Get all trusted domains
 */
function getTrustedDomains() {
  return [...TRUSTED_DOMAINS];
}

/**
 * Test trusted source validation
 */
function testTrustedSources() {
  console.log('🧪 Testing trusted source validation...');
  
  const testSources = [
    'Amazon',
    'amazon.com',
    'www.amazon.com',
    'Walmart',
    'walmart.com',
    'Target - Seller XYZ',
    'Home Depot',
    'homedepot.com',
    'Best Buy',
    'bestbuy.com',
    'eBay', // Should be false
    'Alibaba', // Should be false
    'Unknown Marketplace', // Should be false
    'REI',
    'rei.com',
    'Costco',
    'costco.com'
  ];
  
  const results = testSources.map(source => {
    const validation = validateSource(source);
    return {
      source,
      isTrusted: validation.isTrusted,
      cleanName: validation.cleanName,
      domain: validation.domain
    };
  });
  
  console.log('Test results:');
  results.forEach(result => {
    console.log(`  ${result.source} → ${result.isTrusted ? '✅' : '❌'} ${result.cleanName} (${result.domain || 'N/A'})`);
  });
  
  return results;
}

module.exports = {
  TRUSTED_DOMAINS,
  TRUSTED_SOURCE_PATTERNS,
  isTrustedSource,
  extractRetailerName,
  getTrustedDomain,
  filterTrustedResults,
  validateSource,
  getTrustedDomains,
  testTrustedSources
};
