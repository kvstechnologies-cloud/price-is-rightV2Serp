// utils/category_baselines.js - Category Baseline Pricing (last-ditch floor, guarantees a number)
const baselines = require('./category_baselines.json');

/**
 * Estimate price from category baseline (guarantees a numeric price 100% of the time)
 */
function estimateFromBaseline(facts) {
  console.log('🛡️ BASELINE ESTIMATION: Using category baselines for guaranteed pricing');
  console.log('📊 Input facts:', { category: facts.category, subcategory: facts.subcategory });

  const category = facts.category || 'General';
  const subcategory = facts.subcategory || null;
  
  // Get baseline price with fallback hierarchy
  let basePrice = getBaselinePrice(category, subcategory);
  
  console.log(`💰 Base price from category "${category}"${subcategory ? ` > "${subcategory}"` : ''}: $${basePrice}`);

  // REMOVED: Condition adjustments - always price for NEW products as requested
  let adjustedPrice = basePrice; // No adjustments - always use base price for NEW items

  // Ensure minimum price of $0.10 (allow legitimate low-priced items)
  adjustedPrice = Math.max(0.10, adjustedPrice);
  
  // Round to 2 decimals
  adjustedPrice = Math.round(adjustedPrice * 100) / 100;

  const result = {
    status: 'ESTIMATED',
    pricingTier: 'BASELINE',
    basePrice: basePrice,
    adjustedPrice: adjustedPrice,
    currency: 'USD',
    source: 'Category Baseline',
    url: createSearchUrl(facts),
    pricer: 'AI-Enhanced',
    confidence: 0.35,
    notes: `Baseline estimate from category: ${category}${subcategory ? ` > ${subcategory}` : ''}`
  };

  console.log('✅ Baseline estimation complete:', {
    basePrice: result.basePrice,
    adjustedPrice: result.adjustedPrice,
    pricingTier: result.pricingTier
  });

  return result;
}

/**
 * Get baseline price with fallback hierarchy: subcategory > category > default
 */
function getBaselinePrice(category, subcategory) {
  // Normalize category name
  const normalizedCategory = findBestCategoryMatch(category);
  
  if (baselines[normalizedCategory]) {
    const categoryData = baselines[normalizedCategory];
    
    // Try subcategory first
    if (subcategory) {
      const normalizedSubcategory = findBestSubcategoryMatch(categoryData, subcategory);
      if (normalizedSubcategory && categoryData[normalizedSubcategory]) {
        console.log(`🎯 Found subcategory match: ${normalizedCategory} > ${normalizedSubcategory}`);
        return categoryData[normalizedSubcategory];
      }
    }
    
    // Fall back to category default
    if (categoryData.default) {
      console.log(`🎯 Using category default: ${normalizedCategory}`);
      return categoryData.default;
    }
  }
  
  // Ultimate fallback to General > default
  console.log('🔄 Using ultimate fallback: General > default');
  return baselines.General.default;
}

/**
 * Find best matching category from available baselines
 */
function findBestCategoryMatch(category) {
  if (!category || typeof category !== 'string') return 'General';
  
  const categoryLower = category.toLowerCase();
  const availableCategories = Object.keys(baselines);
  
  // Exact match
  const exactMatch = availableCategories.find(cat => cat.toLowerCase() === categoryLower);
  if (exactMatch) return exactMatch;
  
  // Partial match
  const partialMatch = availableCategories.find(cat => 
    cat.toLowerCase().includes(categoryLower) || categoryLower.includes(cat.toLowerCase())
  );
  if (partialMatch) return partialMatch;
  
  // Category mapping for common variations
  const categoryMappings = {
    'cooler': 'Coolers',
    'coolers': 'Coolers',
    'refrigerator': 'Appliances',
    'washer': 'Appliances',
    'dryer': 'Appliances',
    'mixer': 'Appliances',
    'blender': 'Appliances',
    'sewing machine': 'Appliances',
    'mailbox': 'Mailboxes',
    'mailboxes': 'Mailboxes',
    'chair': 'Furniture',
    'chairs': 'Furniture',
    'table': 'Furniture',
    'tables': 'Furniture',
    'sofa': 'Furniture',
    'sofas': 'Furniture',
    'bed': 'Furniture',
    'beds': 'Furniture',
    'dresser': 'Furniture',
    'dressers': 'Furniture',
    'chest': 'Furniture',
    'drawer': 'Furniture',
    'drawers': 'Furniture',
    'nightstand': 'Furniture',
    'nightstands': 'Furniture',
    'furniture': 'Furniture',
    'mattress': 'Mattresses',
    'mattresses': 'Mattresses',
    'innerspring': 'Mattresses',
    'memory foam': 'Mattresses',
    'queen': 'Mattresses',
    'king': 'Mattresses',
    'twin': 'Mattresses',
    'full': 'Mattresses',
    'tv': 'Electronics',
    'laptop': 'Electronics',
    'phone': 'Electronics',
    'tablet': 'Electronics',
    'electronics': 'Electronics',
    'lamp': 'Lighting',
    'light': 'Lighting',
    'lighting': 'Lighting',
    'vacuum': 'Cleaning',
    'cleaner': 'Cleaning',
    'cleaning': 'Cleaning',
    'tool': 'Tools',
    'tools': 'Tools',
    'drill': 'Tools',
    'saw': 'Tools',
    'car': 'Automotive',
    'auto': 'Automotive',
    'automotive': 'Automotive',
    'bike': 'Sports',
    'exercise': 'Sports',
    'sports': 'Sports',
    'clothing': 'Clothing',
    'shirt': 'Clothing',
    'pants': 'Clothing',
    'book': 'Books',
    'books': 'Books',
    'toy': 'Toys',
    'toys': 'Toys',
    'game': 'Toys',
    'health': 'Health',
    'beauty': 'Beauty',
    'makeup': 'Beauty',
    'pet': 'Pet Supplies',
    'office': 'Office',
    'baby': 'Baby',
    'jewelry': 'Jewelry',
    'music': 'Musical Instruments',
    'craft': 'Crafts',
    'crafts': 'Crafts',
    'garden': 'Garden',
    'plant': 'Garden',
    'outdoor': 'Outdoor'
  };
  
  const mappedCategory = categoryMappings[categoryLower];
  if (mappedCategory && baselines[mappedCategory]) {
    return mappedCategory;
  }
  
  return 'General';
}

/**
 * Find best matching subcategory within a category
 */
function findBestSubcategoryMatch(categoryData, subcategory) {
  if (!subcategory || typeof subcategory !== 'string') return null;
  
  const subcategoryLower = subcategory.toLowerCase();
  const availableSubcategories = Object.keys(categoryData).filter(key => key !== 'default');
  
  // Exact match
  const exactMatch = availableSubcategories.find(sub => sub.toLowerCase() === subcategoryLower);
  if (exactMatch) return exactMatch;
  
  // Partial match
  const partialMatch = availableSubcategories.find(sub => 
    sub.toLowerCase().includes(subcategoryLower) || subcategoryLower.includes(sub.toLowerCase())
  );
  if (partialMatch) return partialMatch;
  
  return null;
}

// REMOVED: applyConditionAdjustments function - no more condition adjustments
// Always price for NEW products as requested by user

/**
 * Create a search URL for the product
 */
function createSearchUrl(facts) {
  const query = [
    facts.brand,
    facts.title,
    facts.category,
    facts.subcategory
  ].filter(Boolean).join(' ').trim();
  
  if (query) {
    return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
  }
  
  return 'https://www.google.com/search?tbm=shop&q=replacement+product';
}

/**
 * Get all available categories
 */
function getAvailableCategories() {
  return Object.keys(baselines);
}

/**
 * Get all subcategories for a given category
 */
function getSubcategories(category) {
  const normalizedCategory = findBestCategoryMatch(category);
  if (baselines[normalizedCategory]) {
    return Object.keys(baselines[normalizedCategory]).filter(key => key !== 'default');
  }
  return [];
}

/**
 * Test baseline estimation with various inputs
 */
function testBaselineEstimation() {
  console.log('🧪 Testing baseline estimation...');
  
  const testCases = [
    {
      name: 'Igloo Cooler',
      facts: { category: 'Coolers', subcategory: 'Beverage Coolers', condition: 'good', damage: false }
    },
    {
      name: 'Queen Mattress',
      facts: { category: 'Mattresses', subcategory: 'Queen', condition: 'fair', damage: false }
    },
    {
      name: 'Unknown Product',
      facts: { category: 'General', subcategory: 'Unknown', condition: 'good', damage: true }
    },
    {
      name: 'Damaged Mailbox',
      facts: { category: 'Mailboxes', subcategory: 'Cast Aluminum', condition: 'poor', damage: true }
    }
  ];
  
  const results = testCases.map(testCase => {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    const result = estimateFromBaseline(testCase.facts);
    return {
      name: testCase.name,
      basePrice: result.basePrice,
      adjustedPrice: result.adjustedPrice,
      pricingTier: result.pricingTier
    };
  });
  
  console.log('\n📊 Test Results Summary:');
  results.forEach(result => {
    console.log(`  ${result.name}: $${result.basePrice} → $${result.adjustedPrice} (${result.pricingTier})`);
  });
  
  return results;
}

module.exports = {
  estimateFromBaseline,
  getBaselinePrice,
  findBestCategoryMatch,
  findBestSubcategoryMatch,
  getAvailableCategories,
  getSubcategories,
  testBaselineEstimation
};
