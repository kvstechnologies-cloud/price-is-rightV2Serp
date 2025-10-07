const express = require('express');
const router = express.Router();
const DirectUrlResolver = require('../services/DirectUrlResolver');

// Initialize the resolver
const urlResolver = new DirectUrlResolver();

/**
 * POST /api/resolve-estimated-items
 * Resolve estimated items to found items with direct URLs
 */
router.post('/api/resolve-estimated-items', async (req, res) => {
  try {
    console.log('🔍 URL Resolution API called');
    
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        error: 'Items array is required',
        example: {
          items: [
            {
              description: 'Office Chair',
              source: 'Target',
              url: 'https://www.target.com/s?searchTerm=office+chair',
              price: 150,
              status: 'Estimated'
            }
          ]
        }
      });
    }
    
    // Filter to only estimated items
    const estimatedItems = items.filter(item => 
      item.status === 'Estimated' || 
      item.status === 'estimated' ||
      (item.url && (item.url.includes('google.com') || item.url.includes('search')))
    );
    
    console.log(`📊 Found ${estimatedItems.length} estimated items to resolve`);
    
    if (estimatedItems.length === 0) {
      return res.json({
        success: true,
        message: 'No estimated items found to resolve',
        results: items,
        stats: {
          total: items.length,
          estimated: 0,
          resolved: 0,
          successRate: '100%'
        }
      });
    }
    
    // Resolve the estimated items
    const startTime = Date.now();
    const resolvedItems = await urlResolver.resolveEstimatedItems(estimatedItems);
    const endTime = Date.now();
    
    // Update the original items array with resolved results
    const updatedItems = items.map(originalItem => {
      const resolvedItem = resolvedItems.find(resolved => 
        resolved.description === originalItem.description
      );
      
      return resolvedItem || originalItem;
    });
    
    // Calculate statistics
    const totalItems = updatedItems.length;
    const foundItems = updatedItems.filter(item => item.status === 'Found').length;
    const finalEstimatedItems = updatedItems.filter(item => item.status === 'Estimated').length;
    const resolvedCount = resolvedItems.filter(item => item.status === 'Found').length;
    const successRate = ((foundItems / totalItems) * 100).toFixed(1);
    
    console.log(`✅ Resolution complete in ${endTime - startTime}ms`);
    console.log(`📊 Results: ${foundItems}/${totalItems} Found (${successRate}%)`);
    
    res.json({
      success: true,
      message: `Successfully resolved ${resolvedCount} items`,
      results: updatedItems,
      stats: {
        total: totalItems,
        found: foundItems,
        estimated: finalEstimatedItems,
        resolved: resolvedCount,
        successRate: `${successRate}%`,
        processingTimeMs: endTime - startTime
      },
      resolutionDetails: resolvedItems.filter(item => item.resolutionStrategy)
    });
    
  } catch (error) {
    console.error('❌ URL Resolution API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/resolution-stats
 * Get statistics about URL resolution performance
 */
router.get('/api/resolution-stats', async (req, res) => {
  try {
    // This would typically query a database for historical stats
    res.json({
      success: true,
      stats: {
        totalResolutions: 0,
        successRate: '0%',
        averageResolutionTime: '0ms',
        strategies: {
          'serpapi_product_api': { attempts: 0, successes: 0 },
          'retailer_site_search': { attempts: 0, successes: 0 },
          'web_scraping': { attempts: 0, successes: 0 },
          'ai_enhanced_search': { attempts: 0, successes: 0 }
        }
      }
    });
  } catch (error) {
    console.error('❌ Resolution stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
