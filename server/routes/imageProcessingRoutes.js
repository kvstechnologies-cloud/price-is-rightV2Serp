// routes/imageProcessingRoutes.js - Simple Image Processing (based on old working project)
const express = require('express');
const multer = require('multer');
const router = express.Router();

// Import the vision extraction system
const { visionExtractProductFacts } = require('../utils/visionExtractor');
const { buildSerpQueries, buildSerpParams } = require('../utils/queryBuilder');

// Import depreciation service
const DepServiceSimple = require('../services/DepServiceSimple');

// Import audit system
let Audit;
try {
  const auditSystem = require('../../src/audit/index.js');
  Audit = Audit;
  console.log('✅ Audit system imported successfully');
} catch (error) {
  console.log('⚠️ Audit system not available:', error.message);
  Audit = null;
}

// Configure multer for image uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Centralized domain policy
const { TRUSTED_DOMAINS, UNTRUSTED_DOMAINS, domainInList } = require('../config/domains');
const { isTrustedSite, isDomainUntrusted } = require('../config/domains');

// Simple function to search for NEW product prices using SerpAPI (based on old working project)
async function searchForNewProductPrices(query, facts) {
  try {
    if (!process.env.SERPAPI_KEY) {
      console.log('⚠️ SERPAPI_KEY not available');
      return null;
    }

    console.log(`🔍 Searching for NEW product: "${query}"`);

    // Use simple SerpAPI search - keep it basic like the old working project
    const serpUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}&num=20&gl=us&hl=en`;
    
    const response = await fetch(serpUrl);
    const results = await response.json();

    if (results.shopping_results && results.shopping_results.length > 0) {
      console.log(`📦 Found ${results.shopping_results.length} results`);
      
             // Simple filtering like old project - just basic price validation and trusted sources
       const validResults = results.shopping_results.filter(r => {
         const price = parseFloat(r.extracted_price || 0);
         const source = r.source || '';
         
         // Basic validation like old project
         if (price <= 0) return false;
         if (price < 0.10) return false; // No extremely low prices (less than $0.10)
         
         // Check if trusted source using new comprehensive trusted sites system
         const isTrusted = isTrustedSite(source);
         
         if (isTrusted) {
           console.log(`✅ Found trusted source: ${source} at $${price}`);
           return true;
         }
         
         // Also check for untrusted sources
         const isUntrusted = isDomainUntrusted(source);
         if (isUntrusted) {
           console.log(`🚫 Excluding untrusted: ${source}`);
           return false;
         }
         
         // If source is unclear, still include it (less restrictive like old project)
         console.log(`⚠️ Including unclear source: ${source} at $${price}`);
         return true;
       });

      console.log(`✅ Found ${validResults.length} valid results from trusted sources`);
      
      if (validResults.length > 0) {
        // Take the first valid result (simple approach like old project)
        const bestResult = validResults[0];
        const price = parseFloat(bestResult.extracted_price);
        
        return {
          status: 'FOUND',
          basePrice: price,
          source: bestResult.source,
          url: bestResult.link || bestResult.product_link || '',
          notes: `Found NEW product at ${bestResult.source}`,
          confidence: 0.8
        };
      }
    }

    return null;

  } catch (error) {
    console.error('❌ Search failed:', error);
    return null;
  }
}

// Simple route for processing images - ONLY NEW products
router.post('/api/process-images', async (req, res) => {
  console.log('🖼️ Processing images for NEW products only...');
  
  try {
    if (!req.body || !req.body.images || !Array.isArray(req.body.images) || req.body.images.length === 0) {
      return res.status(400).json({ 
        error: 'No images provided',
        status: 'ERROR'
      });
    }

    const startTime = Date.now();
    const results = [];
    
    // Process each image
    for (let i = 0; i < req.body.images.length; i++) {
      const imageData = req.body.images[i];
      console.log(`🖼️ Processing image ${i + 1}/${req.body.images.length}`);
      
      try {
        // Handle different image data formats
        let buffer;
        
        if (typeof imageData === 'string') {
          // Direct base64 string
          if (imageData.startsWith('data:image/')) {
            buffer = Buffer.from(imageData.split(',')[1], 'base64');
          } else {
            buffer = Buffer.from(imageData, 'base64');
          }
        } else if (imageData && typeof imageData === 'object') {
          // Object with image field
          if (imageData.image && typeof imageData.image === 'string') {
            if (imageData.image.startsWith('data:image/')) {
              buffer = Buffer.from(imageData.image.split(',')[1], 'base64');
            } else {
              buffer = Buffer.from(imageData.image, 'base64');
            }
          } else if (imageData.base64 && typeof imageData.base64 === 'string') {
            if (imageData.base64.startsWith('data:image/')) {
              buffer = Buffer.from(imageData.base64.split(',')[1], 'base64');
            } else {
              buffer = Buffer.from(imageData.base64, 'base64');
            }
          } else {
            throw new Error(`Unsupported image data format. Expected 'image' or 'base64' field, got: ${Object.keys(imageData).join(', ')}`);
          }
        } else {
          throw new Error(`Unsupported image data type: ${typeof imageData}`);
        }
        
        console.log(`✅ Image buffer created, size: ${buffer.length} bytes`);

        // Step 1: Get product info from Vision API (NO PRICE ESTIMATION)
        console.log('👁️ Getting product info (no price estimation)...');
        const facts = await visionExtractProductFacts(buffer);
        
        if (!facts || !facts.title) {
          console.log('❌ Vision extraction failed');
          results.push({
            status: 'ERROR',
            error: 'Failed to extract product info',
            imageIndex: i
          });
          continue;
        }

        console.log('✅ Product info:', facts.title);

        // Step 2: Search for NEW product prices from trusted sources (SERP-optimized approach)
        console.log('🔍 Searching for NEW product prices...');
        const serpParams = buildSerpParams(facts);
        const marketResult = await searchForNewProductPrices(serpParams.q, facts);

        // Step 3: Create final result - use market price if found
        let finalResult;
        
        if (marketResult && marketResult.basePrice > 0) {
          // Use market price for NEW product
          console.log('✅ Using market price for NEW product');
          finalResult = {
            status: 'FOUND',
            pricingTier: 'SERP', // FIXED: Use SERP for found items to match frontend calculation
            basePrice: marketResult.basePrice,
            source: marketResult.source,
            url: marketResult.url,
            notes: marketResult.notes,
            confidence: marketResult.confidence,
            costToReplace: marketResult.basePrice, // Same as replacement price for NEW
            replacementPrice: marketResult.basePrice,
            replacementSource: marketResult.source,
            totalReplacementPrice: marketResult.basePrice,
            // Add frontend-expected fields
            'Item Description': facts.title,
            'Price': marketResult.basePrice,
            'Source': marketResult.source,
            'URL': marketResult.url,
            'Search Status': 'FOUND',
            'Cost to Replace Pre-Tax (each)': marketResult.basePrice,
            'Total Replacement Price': marketResult.basePrice // FIXED: Add this field for Excel export
          };
        } else {
          // No market price found - create fallback
          console.log('⚠️ No market price found, creating fallback result');
          
          finalResult = {
            status: 'NO_MARKET_PRICE',
            pricingTier: 'FALLBACK', // FIXED: Use FALLBACK for estimated items to match frontend calculation
            basePrice: null,
            source: 'Market search completed - no trusted prices found',
            url: '',
            notes: 'Searched but no trusted market prices found',
            confidence: 0.0,
            costToReplace: null,
            replacementPrice: null,
            replacementSource: 'No trusted source found',
            totalReplacementPrice: null,
            // Add frontend-expected fields
            'Item Description': facts.title,
            'Price': 'Not found',
            'Source': 'No trusted source found',
            'URL': 'N/A',
            'Search Status': 'NO_MARKET_PRICE',
            'Cost to Replace Pre-Tax (each)': 'N/A',
            'Total Replacement Price': null // FIXED: Add this field for Excel export
          };
        }

        // Add metadata
        finalResult.processingTime = Date.now() - startTime;
        finalResult.facts = facts;
        finalResult.imageIndex = i;
        
        results.push(finalResult);
        
      } catch (imageError) {
        console.error(`❌ Error processing image ${i + 1}:`, imageError);
        results.push({
          status: 'ERROR',
          error: imageError.message,
          imageIndex: i
        });
      }
    }

    // Step 4: Apply depreciation enrichment to all results
    try {
      console.log('📦 Applying depreciation enrichment to image results...');
      
      const depItems = results
        .filter(r => r.totalReplacementPrice && r.totalReplacementPrice > 0)
        .map((r, i) => ({
          itemId: `image_${i + 1}`,
          description: r['Item Description'] || r.facts?.title || 'Unknown Item',
          model: r.facts?.model || '',
          room: '', // Images don't have room context
          categoryHint: r.facts?.depCategoryHint || '',
          totalReplacementPrice: r.totalReplacementPrice
        }));

      if (depItems.length > 0) {
        console.log(`📦 Calling DepService.applyDepreciation with ${depItems.length} items`);
        const depResults = await DepServiceSimple.applyDepreciation(depItems);
        console.log('✅ DepService returned results:', depResults.length);

        const depById = new Map(depResults.map(dr => [dr.itemId, dr]));
        results.forEach((r, i) => {
          const key = `image_${i + 1}`;
          const dep = depById.get(key);
          if (dep) {
            console.log(`✅ Setting dep data for image ${i + 1}: ${dep.depCat} (${dep.depPercent * 100}%) = $${dep.depAmount}`);
            r['Dep. Cat'] = dep.depCat;
            r.depCat = dep.depCat;
            r.depPercent = dep.depPercent;
            r.depAmount = dep.depAmount;
            r.depMatch = dep.match;
            r.depCandidates = dep.candidates || [];
          } else {
            console.log(`⚠️ No dep data found for image ${i + 1}, using default`);
            r['Dep. Cat'] = process.env.DEP_DEFAULT_CATEGORY_NAME || '';
            r.depPercent = 0;
            r.depAmount = 0;
            r.depMatch = { strategy: 'default' };
            r.depCandidates = [];
          }
        });
        console.log('✅ Depreciation enrichment completed for images');
      } else {
        console.log('⚠️ No items with valid totalReplacementPrice for depreciation');
        // Set default depreciation values for all results
        results.forEach(r => {
          r['Dep. Cat'] = process.env.DEP_DEFAULT_CATEGORY_NAME || '';
          r.depCat = process.env.DEP_DEFAULT_CATEGORY_NAME || '';
          r.depPercent = 0;
          r.depAmount = 0;
          r.depMatch = { strategy: 'default' };
          r.depCandidates = [];
        });
      }
    } catch (depErr) {
      console.warn('⚠️ Depreciation enrichment failed for images:', depErr.message);
      // Fallback: Set default depreciation values if enrichment fails
      results.forEach(r => {
        r['Dep. Cat'] = process.env.DEP_DEFAULT_CATEGORY_NAME || '';
        r.depCat = process.env.DEP_DEFAULT_CATEGORY_NAME || '';
        r.depPercent = 0;
        r.depAmount = 0;
        r.depMatch = { strategy: 'default' };
        r.depCandidates = [];
      });
    }

    // Return results
    console.log(`✅ Completed processing ${results.length} images for NEW products only`);
    res.json({
      success: true,
      items: results,
      totalProcessed: results.length,
      processingTime: Date.now() - startTime,
      type: 'image_processing_complete'
    });

  } catch (error) {
    console.error('❌ Processing failed:', error);
    res.status(500).json({
      error: 'Image processing failed',
      message: error.message
    });
  }
});

module.exports = router;
