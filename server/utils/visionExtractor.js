// utils/visionExtractor.js - OpenAI Vision → Structured Facts
const { visionWithFallback } = require('./openaiWrapper');
const gpt5Config = require('../config/gpt5Config');

/**
 * Extract structured product facts from image using OpenAI Vision
 * Always returns JSON with required fields (no prose)
 */
async function visionExtractProductFacts(imageBuffer) {
  console.log('👁️ VISION EXTRACTION: Starting OpenAI Vision analysis...');
  
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key not available, using fallback extraction');
      return createFallbackFacts();
    }

    // Convert image buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

    // Create the vision prompt for structured extraction
    const prompt = `You are a product identification expert for insurance claims. Analyze this image and extract structured product information.

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON, no other text
2. Always populate at least "title" + one of ("brand" OR strong "keywords" list)
3. Use light normalization (lowercase brand, strip pack counts)
4. Assess condition and damage based on visual appearance
5. Provide confidence score (0.0 to 1.0)
6. CATEGORIZE ACCURATELY - this is critical for pricing
7. ALWAYS provide estimatedPrice for NEW replacement item (ignore visual condition)
8. Price should reflect what a NEW, clean version would cost, not damaged condition
9. PROVIDE DEPRECIATION CATEGORY HINT - suggest the most likely depreciation category from our database

AVAILABLE CATEGORIES (choose the BEST match):
- Coolers (for water coolers, ice chests, beverage coolers)
- Mattresses (for beds, mattresses, box springs)
- Mailboxes (for postal boxes, mail receptacles)
- Appliances (for kitchen appliances, washers, dryers, microwaves)
- Furniture (for chairs, tables, sofas, beds, dressers, nightstands)
- Electronics (for TVs, laptops, phones, cameras, gaming)
- Lighting (for lamps, fixtures, bulbs)
- Outdoor (for patio furniture, grills, garden items)
- Kitchen (for cookware, utensils, dinnerware)
- Storage (for bins, boxes, organizers)
- Cleaning (for vacuums, cleaners, supplies)
- Tools (for power tools, hand tools, equipment)
- Automotive (for car parts, accessories)
- Sports (for exercise equipment, sports gear)
- Clothing (for apparel, shoes, accessories)
- Books, Toys, Health, Beauty, Pet Supplies, Office, Baby, Jewelry, Musical Instruments, Crafts, Garden
- General (ONLY if none of the above categories fit)

SUBCATEGORY EXAMPLES:
- Furniture: Chairs, Tables, Sofas, Beds, Dressers, Nightstands, Dining Sets, Office Chairs, Recliners
- Mattresses: Queen, King, Twin, Full, Memory Foam, Innerspring, Hybrid
- Appliances: Refrigerators, Washers, Dryers, Dishwashers, Microwaves, Stand Mixers, Blenders
- Electronics: TVs, Laptops, Tablets, Smartphones, Headphones, Speakers, Cameras

Return JSON with this EXACT structure:
{
  "title": "Product name as you see it",
  "brand": "Brand name (lowercase, or null if unclear)",
  "model": "Model number/name (or null if not visible)",
  "category": "Main product category from list above",
  "subcategory": "Specific subcategory",
  "attributes": ["key", "attributes", "like", "size", "color", "material"],
  "keywords": ["search", "keywords", "for", "finding", "similar", "products"],
  "condition": "poor|fair|good",
  "damage": true|false,
  "confidence": 0.0,
  "estimatedPrice": 0.0,
  "depCategoryHint": "Suggested depreciation category name from our database",
  "depCategoryConfidence": 0.0
}

CATEGORIZATION EXAMPLES:
- Dresser/chest of drawers → {"category": "Furniture", "subcategory": "Dressers"}
- Queen mattress → {"category": "Mattresses", "subcategory": "Queen"}
- Innerspring mattress → {"category": "Mattresses", "subcategory": "Innerspring"}
- Water cooler → {"category": "Coolers", "subcategory": "Beverage Coolers"}
- Mailbox → {"category": "Mailboxes", "subcategory": "Post Mount"}
- Sewing machine → {"category": "Appliances", "subcategory": "Small Appliances"}

DEPRECIATION CATEGORY HINTS (use these EXACT names from our database):
IMPORTANT: Look at the product carefully and choose the MOST APPROPRIATE category. Do NOT default to "(Select)" unless you cannot determine the product type at all.

- Kitchen items (mixers, blenders, cookware, utensils, dishes, cups, bowls, pans, pots, knives, forks, spoons, containers, jars, bottles, thermos, lunchbox) → {"depCategoryHint": "KCW - KITCHEN (STORAGE)", "depCategoryConfidence": 0.9}
- Electronics (TVs, laptops, phones, tablets, cameras, speakers, headphones, gaming consoles, computers, chargers, cables, batteries) → {"depCategoryHint": "ELC - ELECTRONICS B", "depCategoryConfidence": 0.8}
- Bedding/mattresses (beds, mattresses, box springs, sheets, pillows, blankets, comforters, duvets, quilts, bedspreads, bedframes, headboards, nightstands, dressers, wardrobes) → {"depCategoryHint": "LIN - BEDDING II", "depCategoryConfidence": 0.9}
- Sporting goods (exercise equipment, fitness gear, gym equipment, workout items, sports equipment, games, bicycles, treadmills, weights, yoga mats, balls, rackets, clubs, camping gear, outdoor recreation) → {"depCategoryHint": "SPG - SPORTING GOODS", "depCategoryConfidence": 0.8}
- Furniture (chairs, tables, desks, sofas, couches, loveseats, ottomans, coffee tables, dining tables, office furniture, living room furniture, bedroom furniture, home decor) → {"depCategoryHint": "FRN - FURNITURE", "depCategoryConfidence": 0.9}
- Major appliances (refrigerators, washers, dryers, dishwashers, stoves, ranges, ovens, cooktops, microwaves, air conditioners, heaters, furnaces, water heaters, garbage disposals) → {"depCategoryHint": "APM - APPLIANCES (MAJOR)", "depCategoryConfidence": 0.9}
- Outdoor/patio items (patio furniture, garden items, plants, flowers, trees, shrubs, grass, lawn items, decks, porches, balconies, walkways, fences, gates, sheds, garages, pools, spas, hot tubs) → {"depCategoryHint": "LGP - OUTDOOR/PATIO", "depCategoryConfidence": 0.8}
- Food items (food, beverages, alcohol, drinks, snacks, candy, chocolate, soda, juice, milk, water, beer, wine, liquor, medicine, vitamins, supplements, cosmetics, toiletries, personal care items) → {"depCategoryHint": "PER - FOOD", "depCategoryConfidence": 0.7}
- Unknown/unclear (ONLY if you cannot see the product or determine what it is) → {"depCategoryHint": "(Select)", "depCategoryConfidence": 0.0}

DEPRECIATION CATEGORY SELECTION RULES:
1. Look at the product's PRIMARY function and material
2. Consider the room/context where it would typically be used
3. Match to the MOST SPECIFIC category that fits
4. If it could fit multiple categories, choose the one with the most specific match
5. Only use "(Select)" if the product is completely unrecognizable
6. For mixed-use items, choose the category that represents the primary function

EXAMPLES OF GOOD DEPRECIATION CATEGORY MATCHING:
- A kitchen mixer → "KCW - KITCHEN (STORAGE)" (it's a kitchen tool)
- A laptop computer → "ELC - ELECTRONICS B" (it's electronic equipment)
- A queen mattress → "LIN - BEDDING II" (it's bedding)
- A treadmill → "SPG - SPORTING GOODS" (it's exercise equipment)
- A dining table → "FRN - FURNITURE" (it's furniture)
- A refrigerator → "APM - APPLIANCES (MAJOR)" (it's a major appliance)
- A patio chair → "LGP - OUTDOOR/PATIO" (it's outdoor furniture)
- A bottle of wine → "PER - FOOD" (it's a consumable beverage)

PRICE ESTIMATION EXAMPLES:
- Queen mattress: estimatedPrice: 800.0 (typical new queen mattress range)
- Water cooler: estimatedPrice: 120.0 (typical new water cooler range)
- Mailbox: estimatedPrice: 150.0 (typical new mailbox range)
- Sewing machine: estimatedPrice: 200.0 (typical new sewing machine range)
- Dresser: estimatedPrice: 400.0 (typical new dresser range)

IMPORTANT: Always estimate for NEW, clean condition regardless of visible damage or stains.

Analyze the image now:`;

        console.log('🔍 Sending image to OpenAI Vision API...');
    
    const model = gpt5Config.getVisionModel();
    
    const result = await visionWithFallback({
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ]
    });
    
    const response = result.response;

    const content = response.choices[0].message.content.trim();
    console.log('📝 Raw OpenAI Vision response:', content);

    // Parse the JSON response
    let facts;
    try {
      // Clean the response in case there's extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      facts = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI Vision JSON response:', parseError);
      console.log('Raw content:', content);
      return createFallbackFacts();
    }

    // Validate and normalize the extracted facts
    const normalizedFacts = normalizeFacts(facts);
    
    console.log('✅ Vision extraction successful:', normalizedFacts);
    return normalizedFacts;

  } catch (error) {
    console.error('❌ Vision extraction failed:', error.message);
    
         // The robust wrapper handles all fallbacks automatically
     // Just log the error for debugging
     console.log('❌ Vision extraction failed (fallback handled by wrapper):', error.message);
    
    return createFallbackFacts();
  }
}

/**
 * Normalize and validate extracted facts
 */
function normalizeFacts(rawFacts) {
  const facts = {
    title: null,
    brand: null,
    model: null,
    category: 'General',
    subcategory: 'Unknown',
    attributes: [],
    keywords: [],
    condition: 'good',
    damage: false,
    confidence: 0.0,
    depCategoryHint: '(Select)',
    depCategoryConfidence: 0.0
  };

  // Normalize title
  if (rawFacts.title && typeof rawFacts.title === 'string') {
    facts.title = rawFacts.title.trim();
  }

  // Normalize brand (lowercase, strip pack counts)
  if (rawFacts.brand && typeof rawFacts.brand === 'string') {
    facts.brand = rawFacts.brand.toLowerCase()
      .replace(/\b\d+\s*pack\b/gi, '') // Remove pack counts
      .replace(/\b\d+\s*ct\b/gi, '')   // Remove count indicators
      .trim();
  }

  // Normalize model
  if (rawFacts.model && typeof rawFacts.model === 'string') {
    facts.model = rawFacts.model.trim();
  }

  // Normalize category
  if (rawFacts.category && typeof rawFacts.category === 'string') {
    facts.category = rawFacts.category.trim();
  }

  // Normalize subcategory
  if (rawFacts.subcategory && typeof rawFacts.subcategory === 'string') {
    facts.subcategory = rawFacts.subcategory.trim();
  }

  // Normalize depreciation category hint
  if (rawFacts.depCategoryHint && typeof rawFacts.depCategoryHint === 'string') {
    facts.depCategoryHint = rawFacts.depCategoryHint.trim();
  }

  // Normalize depreciation category confidence
  if (typeof rawFacts.depCategoryConfidence === 'number') {
    facts.depCategoryConfidence = Math.max(0, Math.min(1, rawFacts.depCategoryConfidence));
  }

  // CRITICAL FIX: Apply intelligent category detection if categorized as "General"
  if (facts.category === 'General' && facts.title) {
    const smartCategory = detectCategoryFromTitle(facts.title);
    if (smartCategory.category !== 'General') {
      console.log(`🔍 SMART CATEGORIZATION: "${facts.title}" → ${smartCategory.category} > ${smartCategory.subcategory}`);
      facts.category = smartCategory.category;
      facts.subcategory = smartCategory.subcategory;
    }
  }

  // Normalize attributes array
  if (Array.isArray(rawFacts.attributes)) {
    facts.attributes = rawFacts.attributes
      .filter(attr => attr && typeof attr === 'string')
      .map(attr => attr.trim())
      .filter(attr => attr.length > 0);
  }

  // Normalize keywords array
  if (Array.isArray(rawFacts.keywords)) {
    facts.keywords = rawFacts.keywords
      .filter(keyword => keyword && typeof keyword === 'string')
      .map(keyword => keyword.toLowerCase().trim())
      .filter(keyword => keyword.length > 0);
  }

  // Normalize condition
  if (rawFacts.condition && ['poor', 'fair', 'good'].includes(rawFacts.condition.toLowerCase())) {
    facts.condition = rawFacts.condition.toLowerCase();
  }

  // Normalize damage
  if (typeof rawFacts.damage === 'boolean') {
    facts.damage = rawFacts.damage;
  }

  // Normalize confidence
  if (typeof rawFacts.confidence === 'number' && rawFacts.confidence >= 0 && rawFacts.confidence <= 1) {
    facts.confidence = rawFacts.confidence;
  }

  // Validation: Ensure we have at least title + (brand OR keywords)
  if (!facts.title || (!facts.brand && facts.keywords.length === 0)) {
    console.log('⚠️ Vision extraction validation failed, enhancing with fallback data');
    
    // If we have a title but no brand/keywords, generate keywords from title
    if (facts.title && facts.keywords.length === 0) {
      facts.keywords = generateKeywordsFromTitle(facts.title);
    }
    
    // If we still don't have enough, create a basic title
    if (!facts.title) {
      facts.title = 'Unknown Product';
      facts.keywords = ['product', 'item', 'replacement'];
      facts.confidence = 0.1;
    }
  }

  return facts;
}

/**
 * Detect category and subcategory from product title (smart categorization)
 */
function detectCategoryFromTitle(title) {
  if (!title || typeof title !== 'string') {
    return { category: 'General', subcategory: 'Unknown' };
  }

  const titleLower = title.toLowerCase();
  
  // Define category detection patterns with subcategories
  const categoryPatterns = [
    // Furniture patterns
    {
      patterns: ['dresser', 'chest of drawers', 'drawer', 'drawers', 'bureau'],
      category: 'Furniture',
      subcategory: 'Dressers'
    },
    {
      patterns: ['nightstand', 'bedside table', 'night table'],
      category: 'Furniture',
      subcategory: 'Nightstands'
    },
    {
      patterns: ['dining table', 'kitchen table', 'table'],
      category: 'Furniture',
      subcategory: 'Tables'
    },
    {
      patterns: ['chair', 'office chair', 'desk chair'],
      category: 'Furniture',
      subcategory: 'Chairs'
    },
    {
      patterns: ['sofa', 'couch', 'sectional'],
      category: 'Furniture',
      subcategory: 'Sofas'
    },
    {
      patterns: ['bed frame', 'bed', 'headboard'],
      category: 'Furniture',
      subcategory: 'Beds'
    },
    
    // Mattress patterns
    {
      patterns: ['queen mattress', 'queen size mattress', 'queen bed'],
      category: 'Mattresses',
      subcategory: 'Queen'
    },
    {
      patterns: ['king mattress', 'king size mattress', 'king bed'],
      category: 'Mattresses',
      subcategory: 'King'
    },
    {
      patterns: ['twin mattress', 'twin size mattress', 'twin bed'],
      category: 'Mattresses',
      subcategory: 'Twin'
    },
    {
      patterns: ['full mattress', 'full size mattress', 'double mattress'],
      category: 'Mattresses',
      subcategory: 'Full'
    },
    {
      patterns: ['innerspring mattress', 'innerspring', 'spring mattress'],
      category: 'Mattresses',
      subcategory: 'Innerspring'
    },
    {
      patterns: ['memory foam mattress', 'memory foam', 'foam mattress'],
      category: 'Mattresses',
      subcategory: 'Memory Foam'
    },
    {
      patterns: ['mattress', 'bed mattress'],
      category: 'Mattresses',
      subcategory: 'default'
    },
    
    // Cooler patterns
    {
      patterns: ['water cooler', 'beverage cooler', 'drink cooler', 'igloo cooler'],
      category: 'Coolers',
      subcategory: 'Beverage Coolers'
    },
    {
      patterns: ['ice chest', 'ice cooler'],
      category: 'Coolers',
      subcategory: 'Ice Chests'
    },
    {
      patterns: ['cooler', 'insulated cooler'],
      category: 'Coolers',
      subcategory: 'default'
    },
    
    // Mailbox patterns
    {
      patterns: ['cast aluminum mailbox', 'aluminum mailbox'],
      category: 'Mailboxes',
      subcategory: 'Cast Aluminum'
    },
    {
      patterns: ['victorian mailbox', 'victorian style mailbox'],
      category: 'Mailboxes',
      subcategory: 'Victorian Style'
    },
    {
      patterns: ['post mount mailbox', 'post mailbox'],
      category: 'Mailboxes',
      subcategory: 'Post Mount'
    },
    {
      patterns: ['mailbox', 'mail box', 'postal box'],
      category: 'Mailboxes',
      subcategory: 'default'
    },
    
    // Appliance patterns
    {
      patterns: ['sewing machine', 'singer sewing machine'],
      category: 'Appliances',
      subcategory: 'Small Appliances'
    },
    {
      patterns: ['stand mixer', 'kitchenaid mixer', 'kitchen mixer'],
      category: 'Appliances',
      subcategory: 'Stand Mixers'
    },
    {
      patterns: ['refrigerator', 'fridge'],
      category: 'Appliances',
      subcategory: 'Refrigerators'
    },
    {
      patterns: ['washer', 'washing machine'],
      category: 'Appliances',
      subcategory: 'Washers'
    },
    {
      patterns: ['dryer', 'clothes dryer'],
      category: 'Appliances',
      subcategory: 'Dryers'
    },
    {
      patterns: ['microwave', 'microwave oven'],
      category: 'Appliances',
      subcategory: 'Microwaves'
    },
    
    // Electronics patterns
    {
      patterns: ['tv', 'television', 'smart tv'],
      category: 'Electronics',
      subcategory: 'TVs'
    },
    {
      patterns: ['laptop', 'notebook computer'],
      category: 'Electronics',
      subcategory: 'Laptops'
    },
    {
      patterns: ['tablet', 'ipad'],
      category: 'Electronics',
      subcategory: 'Tablets'
    },
    
    // Lighting patterns
    {
      patterns: ['table lamp', 'desk lamp'],
      category: 'Lighting',
      subcategory: 'Table Lamps'
    },
    {
      patterns: ['floor lamp', 'standing lamp'],
      category: 'Lighting',
      subcategory: 'Floor Lamps'
    },
    {
      patterns: ['lamp', 'light fixture'],
      category: 'Lighting',
      subcategory: 'default'
    }
  ];

  // Find the best matching pattern
  for (const pattern of categoryPatterns) {
    for (const patternText of pattern.patterns) {
      if (titleLower.includes(patternText)) {
        return {
          category: pattern.category,
          subcategory: pattern.subcategory === 'default' ? null : pattern.subcategory
        };
      }
    }
  }

  // No pattern matched
  return { category: 'General', subcategory: 'Unknown' };
}

/**
 * Generate search keywords from product title
 */
function generateKeywordsFromTitle(title) {
  const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
  
  return title.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/) // Split on whitespace
    .filter(word => word.length > 2 && !stopWords.includes(word)) // Filter meaningful words
    .slice(0, 5); // Take first 5 keywords
}

/**
 * Create fallback facts when vision extraction fails
 */
function createFallbackFacts() {
  console.log('🔄 Creating fallback facts for failed vision extraction');
  
  return {
    title: 'Unknown Product',
    brand: null,
    model: null,
    category: 'General',
    subcategory: 'Unknown',
    attributes: [],
    keywords: ['product', 'item', 'replacement'],
    condition: 'good',
    damage: false,
    confidence: 0.1,
    depCategoryHint: '(Select)',
    depCategoryConfidence: 0.0
  };
}

/**
 * Test function to validate vision extraction with sample data
 */
async function testVisionExtraction() {
  console.log('🧪 Testing vision extraction system...');
  
  // Test with fallback (no API key)
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  
  const fallbackResult = await visionExtractProductFacts(Buffer.from('fake image data'));
  console.log('Fallback result:', fallbackResult);
  
  // Restore API key
  if (originalKey) {
    process.env.OPENAI_API_KEY = originalKey;
  }
  
  return fallbackResult;
}

module.exports = {
  visionExtractProductFacts,
  testVisionExtraction,
  normalizeFacts,
  createFallbackFacts,
  detectCategoryFromTitle
};
