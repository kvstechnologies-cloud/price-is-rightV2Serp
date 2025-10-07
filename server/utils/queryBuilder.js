// utils/queryBuilder.js - Query Builder (SERP-optimized approach)

const { getTrustedDomainsForSerp } = require('../config/trustedSites');

/**
 * Build SerpAPI parameters from Vision API output (Chat GPT optimized approach)
 * Returns optimized SerpAPI parameters object
 */
function buildSerpQueries(facts) {
  console.log('🔍 QUERY BUILDER: Building SERP-optimized search from facts:', facts);
  
  // Use the new SERP-optimized approach
  const serpParams = buildSerpParams(facts);
  
  // For backward compatibility, return the query string as an array
  return [serpParams.q];
}

/**
 * Build SerpAPI parameters from Vision API output
 * This is the new optimized approach from Chat GPT advice
 */
function buildSerpParams(vision) {
  // Primary query: just brand + title, keep it simple
  let q = [vision.brand, vision.title].filter(Boolean).join(' ');
  
  // If no brand, just use title
  if (!q.trim()) {
    q = vision.title || 'product';
  }
  
  // Keep the query simple - don't over-complicate it
  console.log('📝 Simple SERP Query:', q);
  
  return {
    engine: 'google_shopping',
    q: q,
    gl: 'us',
    hl: 'en',
    num: 20  // Get more results to improve chances
  };
}

/**
 * Clean and optimize search query
 */
function cleanQuery(query) {
  if (!query || typeof query !== 'string') return '';
  
  return query
    .trim()
    .replace(/[^\w\s-]/g, ' ') // Remove special characters except hyphens
    .replace(/\s+/g, ' ') // Normalize whitespace
    .toLowerCase()
    .substring(0, 100) // Limit length for API
    .trim();
}

/**
 * Build alternative queries for broader search
 */
function buildAlternativeQueries(facts) {
  console.log('🔄 ALTERNATIVE QUERIES: Building broader search queries');
  
  const alternatives = [];
  
  // Generic category searches
  if (facts.category) {
    alternatives.push(facts.category);
    
    if (facts.subcategory) {
      alternatives.push(`${facts.category} ${facts.subcategory}`);
    }
  }
  
  // Attribute-based searches
  if (facts.attributes && facts.attributes.length > 0) {
    // Try each attribute individually
    facts.attributes.forEach(attr => {
      if (facts.category) {
        alternatives.push(`${facts.category} ${attr}`);
      } else {
        alternatives.push(attr);
      }
    });
    
    // Try combinations of attributes
    if (facts.attributes.length > 1) {
      alternatives.push(facts.attributes.slice(0, 2).join(' '));
    }
  }
  
  // Keyword-based searches
  if (facts.keywords && facts.keywords.length > 0) {
    // Try each keyword individually
    facts.keywords.forEach(keyword => {
      alternatives.push(keyword);
    });
    
    // Try combinations of keywords
    if (facts.keywords.length > 1) {
      alternatives.push(facts.keywords.slice(0, 2).join(' '));
      alternatives.push(facts.keywords.slice(0, 3).join(' '));
    }
  }
  
  // Brand-less searches (for when brand is unknown or generic)
  if (facts.title && facts.brand) {
    // Remove brand from title for generic search
    const titleWithoutBrand = facts.title.toLowerCase()
      .replace(facts.brand.toLowerCase(), '')
      .trim();
    if (titleWithoutBrand.length > 0) {
      alternatives.push(titleWithoutBrand);
    }
  }
  
  // Clean and deduplicate
  const cleanedAlternatives = alternatives
    .map(query => cleanQuery(query))
    .filter((query, index, arr) => arr.indexOf(query) === index)
    .filter(query => query.length > 2);
  
  console.log(`🔄 Generated ${cleanedAlternatives.length} alternative queries:`, cleanedAlternatives);
  return cleanedAlternatives;
}

/**
 * Build queries optimized for specific product types
 */
function buildSpecializedQueries(facts) {
  console.log('🎯 SPECIALIZED QUERIES: Building product-specific queries');
  
  const specialized = [];
  const category = facts.category ? facts.category.toLowerCase() : '';
  const subcategory = facts.subcategory ? facts.subcategory.toLowerCase() : '';
  
  // Appliance-specific queries
  if (category.includes('appliance') || subcategory.includes('appliance')) {
    if (facts.brand) {
      specialized.push(`${facts.brand} appliance`);
    }
    
    // Add model year or series if available
    if (facts.model) {
      specialized.push(`${facts.brand || ''} ${facts.model} appliance`.trim());
    }
  }
  
  // Electronics-specific queries
  if (category.includes('electronic') || subcategory.includes('electronic')) {
    if (facts.brand) {
      specialized.push(`${facts.brand} electronics`);
    }
  }
  
  // Furniture-specific queries
  if (category.includes('furniture') || subcategory.includes('furniture')) {
    if (facts.attributes && facts.attributes.length > 0) {
      // Include material and style attributes
      const materialAttrs = facts.attributes.filter(attr => 
        attr.toLowerCase().includes('wood') || 
        attr.toLowerCase().includes('metal') || 
        attr.toLowerCase().includes('plastic') ||
        attr.toLowerCase().includes('fabric')
      );
      
      if (materialAttrs.length > 0) {
        specialized.push(`${materialAttrs[0]} furniture`);
      }
    }
  }
  
  // Outdoor/Garden-specific queries
  if (category.includes('outdoor') || category.includes('garden') || 
      subcategory.includes('outdoor') || subcategory.includes('garden')) {
    specialized.push('outdoor equipment');
    specialized.push('garden supplies');
    
    if (facts.brand) {
      specialized.push(`${facts.brand} outdoor`);
    }
  }
  
  // Kitchen-specific queries
  if (category.includes('kitchen') || subcategory.includes('kitchen')) {
    specialized.push('kitchen equipment');
    
    if (facts.brand) {
      specialized.push(`${facts.brand} kitchen`);
    }
  }
  
  // Clean and return
  const cleanedSpecialized = specialized
    .map(query => cleanQuery(query))
    .filter((query, index, arr) => arr.indexOf(query) === index)
    .filter(query => query.length > 0);
  
  console.log(`🎯 Generated ${cleanedSpecialized.length} specialized queries:`, cleanedSpecialized);
  return cleanedSpecialized;
}

/**
 * Test function to validate query building
 */
function testQueryBuilder() {
  console.log('🧪 Testing query builder...');
  
  // Test case 1: Complete product facts
  const testFacts1 = {
    title: "Igloo 5 Gallon Heavy-Duty Beverage Cooler",
    brand: "igloo",
    model: "5-gallon",
    category: "Coolers",
    subcategory: "Beverage Coolers",
    attributes: ["5 Gallon", "Orange", "Plastic", "Spigot"],
    keywords: ["water cooler", "insulated jug", "drink cooler"],
    condition: "good",
    damage: false,
    confidence: 0.8
  };
  
  console.log('Test 1 - Complete facts:');
  const queries1 = buildSerpQueries(testFacts1);
  console.log('Queries:', queries1);
  
  // Test case 2: Minimal facts
  const testFacts2 = {
    title: "Unknown Product",
    brand: null,
    model: null,
    category: "General",
    subcategory: "Unknown",
    attributes: [],
    keywords: ["product", "item"],
    condition: "good",
    damage: false,
    confidence: 0.1
  };
  
  console.log('\nTest 2 - Minimal facts:');
  const queries2 = buildSerpQueries(testFacts2);
  console.log('Queries:', queries2);
  
  return { queries1, queries2 };
}

module.exports = {
  buildSerpQueries,
  buildSerpParams,
  buildAlternativeQueries,
  buildSpecializedQueries,
  cleanQuery,
  testQueryBuilder
};
