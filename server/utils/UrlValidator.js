// PHASE 3C: Advanced URL Validation System
const axios = require('axios');
const { URL } = require('url');

class UrlValidator {
  constructor() {
    this.validationCache = new Map();
    this.fallbackCache = new Map();
    this.validationTimeout = 3000; // 3 seconds timeout
    this.maxRetries = 2;
    this.stats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      cacheHits: 0,
      averageValidationTime: 0
    };
  }

  // PHASE 3C.1: Advanced URL Validation with Accessibility Checking
  async validateUrl(url, productType = 'general') {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = `validation:${url}:${productType}`;
    const cached = this.validationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
      this.stats.cacheHits++;
      return cached.result;
    }
    
    this.stats.totalValidations++;
    
    try {
      // Basic URL format validation
      if (!this.isValidUrlFormat(url)) {
        const result = {
          isValid: false,
          reason: 'Invalid URL format',
          fallback: this.getFallbackUrl(url, productType),
          validationTime: Date.now() - startTime
        };
        
        this.cacheValidationResult(cacheKey, result);
        return result;
      }
      
      // Accessibility check with timeout
      const isAccessible = await this.checkUrlAccessibility(url);
      
      const result = {
        isValid: isAccessible,
        reason: isAccessible ? 'URL is accessible' : 'URL not accessible',
        fallback: isAccessible ? null : this.getFallbackUrl(url, productType),
        validationTime: Date.now() - startTime,
        statusCode: isAccessible ? 200 : null
      };
      
      this.cacheValidationResult(cacheKey, result);
      this.stats.successfulValidations++;
      
      return result;
      
    } catch (error) {
      this.stats.failedValidations++;
      
      const result = {
        isValid: false,
        reason: `Validation error: ${error.message}`,
        fallback: this.getFallbackUrl(url, productType),
        validationTime: Date.now() - startTime,
        error: error.message
      };
      
      this.cacheValidationResult(cacheKey, result);
      return result;
    }
  }

  // PHASE 3C.1: URL Format Validation
  isValidUrlFormat(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // PHASE 3C.1: URL Accessibility Check with Bot Protection Detection
  async checkUrlAccessibility(url) {
    try {
      const response = await axios.head(url, {
        timeout: this.validationTimeout,
        maxRedirects: 3,
        validateStatus: (status) => status < 400, // Accept 2xx and 3xx status codes
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      return true;
    } catch (error) {
      // Try GET request if HEAD fails
      try {
        const response = await axios.get(url, {
          timeout: this.validationTimeout,
          maxRedirects: 3,
          validateStatus: (status) => status < 400,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        // Check for bot protection pages
        const content = response.data.toLowerCase();
        if (this.isBotProtectionPage(content, url)) {
          return false; // URL is blocked by bot protection
        }
        
        return true;
      } catch (getError) {
        return false;
      }
    }
  }

  // PHASE 3C.1: Bot Protection Detection
  isBotProtectionPage(content, url) {
    const botProtectionIndicators = [
      'robot or human',
      'captcha',
      'verify you are human',
      'bot detection',
      'security check',
      'please verify',
      'access denied',
      'blocked',
      'suspicious activity'
    ];
    
    // Check content for bot protection indicators
    for (const indicator of botProtectionIndicators) {
      if (content.includes(indicator)) {
        return true;
      }
    }
    
    // Check URL patterns that indicate bot protection
    const urlLower = url.toLowerCase();
    if (urlLower.includes('/seort/') || urlLower.includes('/bot/') || urlLower.includes('/security/')) {
      return true;
    }
    
    return false;
  }

  // PHASE 3C.2: Intelligent Fallback Chain
  getFallbackUrl(originalUrl, productType) {
    const fallbackKey = `fallback:${originalUrl}:${productType}`;
    const cached = this.fallbackCache.get(fallbackKey);
    
    if (cached && Date.now() - cached.timestamp < 600000) { // 10 minutes cache
      return cached.fallback;
    }
    
    let fallbackUrl = null;
    
    // Extract product info from URL
    const urlInfo = this.extractProductInfoFromUrl(originalUrl);
    
    // PHASE 3C.2: Smart fallback based on product type and retailer
    if (urlInfo.retailer) {
      switch (urlInfo.retailer) {
        case 'amazon.com':
          fallbackUrl = this.getAmazonFallback(urlInfo, productType);
          break;
        case 'walmart.com':
          fallbackUrl = this.getWalmartFallback(urlInfo, productType);
          break;
        case 'target.com':
          fallbackUrl = this.getTargetFallback(urlInfo, productType);
          break;
        case 'homedepot.com':
          fallbackUrl = this.getHomeDepotFallback(urlInfo, productType);
          break;
        case 'lowes.com':
          fallbackUrl = this.getLowesFallback(urlInfo, productType);
          break;
        case 'bestbuy.com':
          fallbackUrl = this.getBestBuyFallback(urlInfo, productType);
          break;
        case 'wayfair.com':
          fallbackUrl = this.getWayfairFallback(urlInfo, productType);
          break;
        default:
          fallbackUrl = this.getGoogleShoppingFallback(urlInfo.productName, productType);
      }
    } else {
      // Generic fallback to Google Shopping
      fallbackUrl = this.getGoogleShoppingFallback(urlInfo.productName, productType);
    }
    
    // Cache the fallback
    this.fallbackCache.set(fallbackKey, {
      fallback: fallbackUrl,
      timestamp: Date.now()
    });
    
    return fallbackUrl;
  }

  // PHASE 3C.2: Extract Product Info from URL
  extractProductInfoFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Extract retailer
      let retailer = null;
      if (hostname.includes('amazon')) retailer = 'amazon.com';
      else if (hostname.includes('walmart')) retailer = 'walmart.com';
      else if (hostname.includes('target')) retailer = 'target.com';
      else if (hostname.includes('homedepot')) retailer = 'homedepot.com';
      else if (hostname.includes('lowes')) retailer = 'lowes.com';
      else if (hostname.includes('bestbuy')) retailer = 'bestbuy.com';
      else if (hostname.includes('wayfair')) retailer = 'wayfair.com';
      
      // Extract product name from path
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      let productName = pathParts[pathParts.length - 1] || 'Unknown Product';
      
      // Clean product name
      productName = productName.replace(/[^a-zA-Z0-9\s-]/g, ' ').trim();
      
      return {
        retailer,
        productName,
        originalUrl: url,
        hostname
      };
    } catch (error) {
      return {
        retailer: null,
        productName: 'Unknown Product',
        originalUrl: url,
        hostname: 'unknown'
      };
    }
  }

  // PHASE 3C.2: Retailer-Specific Fallbacks
  getAmazonFallback(urlInfo, productType) {
    // Amazon fallback: Try search instead of direct product
    const searchQuery = encodeURIComponent(urlInfo.productName);
    return `https://www.amazon.com/s?k=${searchQuery}`;
  }

  getWalmartFallback(urlInfo, productType) {
    // Walmart fallback: Use Google Shopping to avoid bot protection
    const searchQuery = encodeURIComponent(urlInfo.productName);
    return `https://www.google.com/search?tbm=shop&q=${searchQuery}+walmart`;
  }

  getTargetFallback(urlInfo, productType) {
    // Target fallback: Use Google Shopping to avoid bot protection
    const searchQuery = encodeURIComponent(urlInfo.productName);
    return `https://www.google.com/search?tbm=shop&q=${searchQuery}+target`;
  }

  getHomeDepotFallback(urlInfo, productType) {
    // Home Depot fallback: Try search instead of direct product
    const searchQuery = encodeURIComponent(urlInfo.productName);
    return `https://www.homedepot.com/s/${searchQuery}`;
  }

  getLowesFallback(urlInfo, productType) {
    // Lowes fallback: Try search instead of direct product
    const searchQuery = encodeURIComponent(urlInfo.productName);
    return `https://www.lowes.com/search?searchTerm=${searchQuery}`;
  }

  getBestBuyFallback(urlInfo, productType) {
    // Best Buy fallback: Try search instead of direct product
    const searchQuery = encodeURIComponent(urlInfo.productName);
    return `https://www.bestbuy.com/site/searchpage.jsp?st=${searchQuery}`;
  }

  getWayfairFallback(urlInfo, productType) {
    // Wayfair fallback: Try search instead of direct product
    const searchQuery = encodeURIComponent(urlInfo.productName);
    return `https://www.wayfair.com/keyword.php?keyword=${searchQuery}`;
  }

  getStaplesFallback(urlInfo, productType) {
    // Staples fallback: Try search instead of direct product
    const searchQuery = encodeURIComponent(urlInfo.productName);
    return `https://www.staples.com/search?query=${searchQuery}`;
  }

  getGoogleShoppingFallback(productName, productType) {
    // Google Shopping fallback
    const searchQuery = encodeURIComponent(productName);
    return `https://www.google.com/search?tbm=shop&q=${searchQuery}`;
  }

  // PHASE 3C.2: Cache Validation Results
  cacheValidationResult(key, result) {
    this.validationCache.set(key, {
      result,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.validationCache.size > 1000) {
      const firstKey = this.validationCache.keys().next().value;
      this.validationCache.delete(firstKey);
    }
  }

  // PHASE 3C.3: Analytics and Statistics
  getValidationStats() {
    const totalTime = this.stats.totalValidations > 0 ? 
      this.stats.averageValidationTime * this.stats.totalValidations : 0;
    
    return {
      totalValidations: this.stats.totalValidations,
      successfulValidations: this.stats.successfulValidations,
      failedValidations: this.stats.failedValidations,
      cacheHits: this.stats.cacheHits,
      cacheHitRate: this.stats.totalValidations > 0 ? 
        ((this.stats.cacheHits / this.stats.totalValidations) * 100).toFixed(1) + '%' : '0%',
      successRate: this.stats.totalValidations > 0 ? 
        ((this.stats.successfulValidations / this.stats.totalValidations) * 100).toFixed(1) + '%' : '0%',
      averageValidationTime: this.stats.averageValidationTime.toFixed(2) + 'ms',
      cacheSize: this.validationCache.size,
      fallbackCacheSize: this.fallbackCache.size
    };
  }

  // PHASE 3C.3: Batch URL Validation
  async validateUrls(urls, productType = 'general') {
    const results = [];
    const promises = urls.map(url => this.validateUrl(url, productType));
    
    const batchResults = await Promise.allSettled(promises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push({
          url: urls[index],
          ...result.value
        });
      } else {
        results.push({
          url: urls[index],
          isValid: false,
          reason: `Validation failed: ${result.reason}`,
          fallback: this.getGoogleShoppingFallback('Unknown Product', productType),
          validationTime: 0
        });
      }
    });
    
    return results;
  }

  // PHASE 3C.3: Cleanup and Maintenance
  cleanup() {
    const now = Date.now();
    
    // Clean old validation cache entries (older than 1 hour)
    for (const [key, value] of this.validationCache.entries()) {
      if (now - value.timestamp > 3600000) {
        this.validationCache.delete(key);
      }
    }
    
    // Clean old fallback cache entries (older than 2 hours)
    for (const [key, value] of this.fallbackCache.entries()) {
      if (now - value.timestamp > 7200000) {
        this.fallbackCache.delete(key);
      }
    }
    
    console.log(`🧹 UrlValidator cleanup: ${this.validationCache.size} validation entries, ${this.fallbackCache.size} fallback entries`);
  }

  // PHASE 3C.3: Reset Statistics
  resetStats() {
    this.stats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      cacheHits: 0,
      averageValidationTime: 0
    };
  }
}

module.exports = UrlValidator;

