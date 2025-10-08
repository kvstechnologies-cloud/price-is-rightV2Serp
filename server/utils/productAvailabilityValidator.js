// Product Availability Validator
// Checks if products are actually available before approving them

class ProductAvailabilityValidator {
  constructor() {
    this.unavailableKeywords = [
      'not available',
      'out of stock',
      'discontinued',
      'unavailable',
      'sold out',
      'no longer available',
      'item not found',
      'product not found',
      'temporarily unavailable',
      'backorder',
      'pre-order only'
    ];
    
    this.availabilityIndicators = [
      'in stock',
      'available',
      'add to cart',
      'buy now',
      'purchase',
      'add to bag',
      'in stock now',
      'ready to ship'
    ];
  }

  /**
   * Validates if a product is actually available
   * @param {Object} product - Product object with URL, title, description
   * @returns {Object} - Validation result
   */
  async validateAvailability(product) {
    try {
      console.log(`🔍 AVAILABILITY CHECK: Validating "${product.title || product.Title}"`);
      
      // Check 1: URL validation
      if (!product.url || !product.URL) {
        console.log(`❌ AVAILABILITY REJECTION: No URL provided`);
        return {
          isAvailable: false,
          reason: 'No product URL provided',
          shouldFallback: true
        };
      }

      const url = product.url || product.URL;
      
      // Check 2: URL format validation
      if (!this.isValidProductUrl(url)) {
        console.log(`❌ AVAILABILITY REJECTION: Invalid URL format - ${url}`);
        return {
          isAvailable: false,
          reason: 'Invalid product URL format',
          shouldFallback: true
        };
      }

      // Check 3: Check for unavailable keywords in title/description
      const textToCheck = `${product.title || product.Title || ''} ${product.description || product.Description || ''}`.toLowerCase();
      
      for (const keyword of this.unavailableKeywords) {
        if (textToCheck.includes(keyword.toLowerCase())) {
          console.log(`❌ AVAILABILITY REJECTION: Found unavailable keyword "${keyword}"`);
          return {
            isAvailable: false,
            reason: `Product contains unavailable indicator: "${keyword}"`,
            shouldFallback: true
          };
        }
      }

      // Check 4: Check for availability indicators
      let hasAvailabilityIndicator = false;
      for (const indicator of this.availabilityIndicators) {
        if (textToCheck.includes(indicator.toLowerCase())) {
          hasAvailabilityIndicator = true;
          break;
        }
      }

      if (!hasAvailabilityIndicator) {
        console.log(`⚠️ AVAILABILITY WARNING: No clear availability indicators found`);
        // Don't reject, but mark as uncertain
        return {
          isAvailable: true,
          reason: 'No clear availability indicators found',
          shouldFallback: false,
          confidence: 0.5
        };
      }

      console.log(`✅ AVAILABILITY APPROVAL: Product appears to be available`);
      return {
        isAvailable: true,
        reason: 'Product appears to be available',
        shouldFallback: false,
        confidence: 0.9
      };

    } catch (error) {
      console.error(`❌ AVAILABILITY CHECK ERROR: ${error.message}`);
      return {
        isAvailable: false,
        reason: `Availability check failed: ${error.message}`,
        shouldFallback: true
      };
    }
  }

  /**
   * Validates if URL is a proper product URL
   */
  isValidProductUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    // Check if it's a search URL (should be rejected)
    const searchPatterns = [
      'google.com/search',
      'bing.com/search',
      'yahoo.com/search',
      'duckduckgo.com',
      '/search?',
      '?q=',
      '&q='
    ];
    
    for (const pattern of searchPatterns) {
      if (url.toLowerCase().includes(pattern)) {
        return false;
      }
    }
    
    // Check if it's a proper product URL
    const productPatterns = [
      '/product/',
      '/p/',
      '/item/',
      '/dp/',
      '/gp/product/',
      'amazon.com',
      'target.com',
      'walmart.com',
      'bestbuy.com',
      'homedepot.com',
      'lowes.com'
    ];
    
    for (const pattern of productPatterns) {
      if (url.toLowerCase().includes(pattern)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Performs Google fallback search when no products are found
   */
  async performGoogleFallback(query, targetPrice, tolerance) {
    try {
      console.log(`🔄 GOOGLE FALLBACK: Searching for "${query}" with broader criteria`);
      
      // Create a broader search query
      const fallbackQuery = `${query} buy online price`;
      
      // Return a fallback result that indicates Google search was needed
      return {
        Price: null,
        Currency: "USD",
        Source: "Google Search Fallback",
        URL: `https://www.google.com/search?q=${encodeURIComponent(fallbackQuery)}`,
        Status: "Google Fallback Required",
        Pricer: "Google-Fallback",
        Title: query,
        Brand: "Unknown",
        Model: "Unknown",
        Confidence: 0.3,
        Notes: `No available products found within tolerance. Google search required for "${query}"`,
        MatchedAttributes: {
          Brand: "unknown",
          Model: "unknown",
          UPC_EAN: "unknown",
          Size_Pack: "unknown",
          Color: "unknown",
          Material: "unknown"
        },
        Trace: {
          QueryTermsUsed: [query],
          FallbackReason: 'No available products found within tolerance range',
          Validation: "google_fallback_required"
        }
      };
    } catch (error) {
      console.error(`❌ GOOGLE FALLBACK ERROR: ${error.message}`);
      return null;
    }
  }
}

module.exports = ProductAvailabilityValidator;
