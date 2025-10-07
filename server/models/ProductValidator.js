const axios = require('axios');
const cheerio = require('cheerio');
const pLimit = require('p-limit');
const { TRUSTED_DOMAINS, UNTRUSTED_DOMAINS, normalizeDomain } = require('../config/domains');

// FIXED: Handle node-cache dependency gracefully
let NodeCache;
try {
  NodeCache = require('node-cache');
} catch (error) {
  console.log('⚠️ node-cache not available, using fallback caching');
  // Fallback cache implementation
  NodeCache = class FallbackCache {
    constructor() {
      this.cache = new Map();
      this.ttl = 3600000; // 1 hour in milliseconds
    }
    
    get(key) {
      const item = this.cache.get(key);
      if (!item) return undefined;
      
      if (Date.now() - item.timestamp > this.ttl) {
        this.cache.delete(key);
        return undefined;
      }
      
      return item.value;
    }
    
    set(key, value) {
      this.cache.set(key, {
        value: value,
        timestamp: Date.now()
      });
      
      // Simple cleanup - remove old entries if cache gets too large
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
    }
  };
}

class ProductValidator {
  constructor() {
    try {
      this.cache = new NodeCache({ stdTTL: process.env.CACHE_TTL_SECONDS || 3600 });
      console.log('✅ ProductValidator initialized with node-cache');
    } catch (error) {
      this.cache = new NodeCache();
      console.log('✅ ProductValidator initialized with fallback cache');
    }
    
    // Centralized trusted retailers list
    this.trustedRetailers = TRUSTED_DOMAINS;
    
    
    this.categoryKeywords = {
      'Electronics': ['phone', 'laptop', 'computer', 'tablet', 'camera', 'tv', 'monitor', 'headphones', 'speaker'],
      'Home & Garden': ['adjustable', 'and', 'appears', 'basket', 'bathroom', 'bedding', 'bin', 'black', 'broom', 'brush', 'brushes', 'bucket', 'cedar', 'clothes', 'clothing', 'crate', 'cube', 'curtain', 'decor', 'drawer', 'easywring', 'fabric', 'furniture', 'garage', 'garden', 'hamper', 'hangers', 'hardware', 'holder', 'kitchen', 'laundry', 'lighting', 'mainstays', 'metal', 'modular', 'mop', 'mounting', 'new', 'original', 'outdoor', 'pack', 'packaging', 'paint', 'paper', 'plastic', 'plunger', 'red', 'rod', 'set', 'shelf', 'shower', 'silver', 'spin', 'stand', 'still', 'storage', 'system', 'tall', 'toilet', 'towel', 'unit', 'units', 'unopened', 'utility', 'white', 'wire', 'with', 'wrap'],
      'Clothing & Accessories': ['shirt', 'pants', 'dress', 'shoes', 'watch', 'jewelry', 'bag', 'hat'],
      'Sports & Outdoors': ['fitness', 'exercise', 'sports', 'outdoor', 'camping', 'hiking', 'bike', 'golf'],
      'Health & Beauty': ['beauty', 'black', 'bleach', 'bulk', 'care', 'counter', 'face', 'facial', 'growth', 'hair', 'health', 'kit', 'laboratories', 'makeup', 'mask', 'meds', 'men', 'moisture', 'over', 'package', 'personal', 'personal care', 'revita', 'serum', 'shea', 'skincare', 'supplements', 'the', 'women'],
      'Books & Media': ['book', 'ebook', 'dvd', 'cd', 'music', 'movie', 'game'],
      'Toys & Games': ['action figure', 'baby', 'board game', 'brown', 'car', 'chair', 'child', 'cucumber', 'diapers', 'doll', 'flush', 'game', 'health', 'not', 'peppa', 'pig', 'pink', 'plastic', 'potty', 'puzzle', 'seat', 'step', 'stool', 'toy', 'video game', 'wipes'],
      'Automotive': ['car', 'auto', 'vehicle', 'parts', 'accessories', 'tools', 'maintenance']
    };
    
  }

  // Basic validation function for when full validation isn't needed
  validateProduct(productData) {
    if (!productData) {
      throw new Error('Product data is required');
    }
    
    if (!productData.item_name && !productData.itemDescription && !productData.description) {
      throw new Error('Product name/description is required');
    }
    
    console.log('✅ Basic product validation passed');
    return true;
  }

  // Main validation function
  async validateProductAdvanced(productDescription, minPrice = null, maxPrice = null, operator = 'between') {
    const cacheKey = `${productDescription}_${minPrice}_${maxPrice}_${operator}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      console.log('📋 Returning cached results');
      return cached;
    }

    try {
      console.log(`🔍 Validating: "${productDescription}"`);
      console.log(`💰 Price criteria: ${this.formatPriceCriteria(minPrice, maxPrice, operator)}`);

      // Step 1: Search for products
      const searchResults = await this.performEnhancedSearch(productDescription);
      
      // Step 2: Filter trusted retailers
      const trustedResults = this.filterTrustedRetailers(searchResults);
      
      // Step 3: Extract and validate product data
      const validatedProducts = await this.validateProductPrices(trustedResults, minPrice, maxPrice, operator);
      
      // Step 4: Format results
      const formattedResults = this.formatTableResults(validatedProducts);
      
      const response = {
        query: productDescription,
        priceCriteria: { min: minPrice, max: maxPrice, operator },
        totalFound: formattedResults.length,
        products: formattedResults,
        timestamp: new Date().toISOString(),
        searchTime: Date.now()
      };

      // Cache the results
      this.cache.set(cacheKey, response);
      
      return response;
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      return {
        error: 'Product validation failed',
        query: productDescription,
        details: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Enhanced search strategies
  async performEnhancedSearch(productDescription) {
    // Check if we have Google API credentials
    if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
      console.log('⚠️ Google API credentials not available, using fallback search');
      return this.performFallbackSearch(productDescription);
    }

    const searchQueries = [
      `"${productDescription}" site:amazon.com OR site:target.com OR site:walmart.com`,
      `${productDescription} model number`,
      `${productDescription} buy online price`,
      `"${productDescription}" official retailer`,
      `${productDescription} product specifications`
    ];

    // Execute all search queries in parallel
    const searchPromises = searchQueries.map(query => this.searchGoogle(query));
    const allResults = await Promise.all(searchPromises);
    
    // Flatten results and remove duplicates
    const flattenedResults = allResults.flat();
    return this.removeDuplicates(flattenedResults);
  }

  // Fallback search when Google API is not available
  async performFallbackSearch(productDescription) {
    console.log('🔄 Using fallback search method');
    
    // Use direct retailer search APIs
    const searchUrls = [];
    
    try {
      // Amazon search
      const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(productDescription)}`;
      const amazonResponse = await axios.head(amazonUrl, { timeout: 6000 });
      if (amazonResponse.status === 200) {
        searchUrls.push({
          title: 'Amazon Search Results',
          link: amazonUrl,
          snippet: 'Direct product search results from Amazon'
        });
      }
    } catch (error) {
      console.warn('⚠️ Amazon search unavailable:', error.message);
    }
    
    try {
      // Walmart search
      const walmartUrl = `https://www.walmart.com/search/?query=${encodeURIComponent(productDescription)}`;
      const walmartResponse = await axios.head(walmartUrl, { timeout: 6000 });
      if (walmartResponse.status === 200) {
        searchUrls.push({
          title: 'Walmart Search Results',
          link: walmartUrl,
          snippet: 'Direct product search results from Walmart'
        });
      }
    } catch (error) {
      console.warn('⚠️ Walmart search unavailable:', error.message);
    }
    
    try {
      // Target search
      const targetUrl = `https://www.target.com/s?searchTerm=${encodeURIComponent(productDescription)}`;
      const targetResponse = await axios.head(targetUrl, { timeout: 6000 });
      if (targetResponse.status === 200) {
        searchUrls.push({
          title: 'Target Search Results',
          link: targetUrl,
          snippet: 'Direct product search results from Target'
        });
      }
    } catch (error) {
      console.warn('⚠️ Target search unavailable:', error.message);
    }

    try {
      // Reebok search (brand site)
      const reebokUrl = `https://www.reebok.com/us/search?q=${encodeURIComponent(productDescription)}`;
      const reebokResponse = await axios.head(reebokUrl, { timeout: 6000 });
      if (reebokResponse.status === 200) {
        searchUrls.push({
          title: 'Reebok Search Results',
          link: reebokUrl,
          snippet: 'Direct product search results from Reebok'
        });
      }
    } catch (error) {
      console.warn('⚠️ Reebok search unavailable:', error.message);
    }
    
    try {
      // Singer search (brand site)
      const singerUrl = `https://www.singer.com/search?keywords=${encodeURIComponent(productDescription)}`;
      const singerResponse = await axios.head(singerUrl, { timeout: 6000 });
      if (singerResponse.status === 200) {
        searchUrls.push({
          title: 'Singer Search Results',
          link: singerUrl,
          snippet: 'Direct product search results from Singer'
        });
      }
    } catch (error) {
      console.warn('⚠️ Singer search unavailable:', error.message);
    }

    try {
      // Bissell search (brand site)
      const bissellUrl = `https://www.bissell.com/search?q=${encodeURIComponent(productDescription)}`;
      const bissellResponse = await axios.head(bissellUrl, { timeout: 6000 });
      if (bissellResponse.status === 200) {
        searchUrls.push({
          title: 'Bissell Search Results',
          link: bissellUrl,
          snippet: 'Direct product search results from Bissell'
        });
      }
    } catch (error) {
      console.warn('⚠️ Bissell search unavailable:', error.message);
    }
    
    // Return available search results
    return searchUrls;
  }

  // Google Custom Search
  async searchGoogle(query) {
    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: process.env.GOOGLE_API_KEY,
          cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
          q: query,
          num: 10,
          safe: 'active'
        },
        timeout: 25000
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Google search error:', error.response?.data || error.message);
      return [];
    }
  }

  // Filter trusted retailers
  filterTrustedRetailers(searchResults) {
    return searchResults.filter(result => {
      const domain = this.extractDomain(result.link);
      return this.trustedRetailers.some(retailer => domain.includes(retailer));
    });
  }

  // Validate product prices
  async validateProductPrices(trustedResults, minPrice, maxPrice, operator) {
    const validProducts = [];
    
    const limit = pLimit(5); // Limit concurrent requests to 5
    
    // Process all results in parallel with concurrency control
    const promises = trustedResults.slice(0, 10).map(result => 
      limit(async () => {
        try {
          const productData = await this.extractProductData(result);
          
          if (productData && productData.price) {
            const numericPrice = this.extractNumericPrice(productData.price);
            
            if (this.isPriceValid(numericPrice, minPrice, maxPrice, operator)) {
              console.log(`✅ Valid product found: ${productData.price} at ${productData.source}`);
              return productData;
            }
          }
          
        } catch (error) {
          console.warn(`⚠️ Failed to extract data from ${result.link}`);
        }
        return null;
      })
    );
    
    const results = await Promise.all(promises);
    return results.filter(result => result !== null);
  }

  // Extract product data from page
  async extractProductData(searchResult) {
    try {
      const response = await axios.get(searchResult.link, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const domain = this.extractDomain(searchResult.link);
      
      return this.parseByRetailer($, domain, searchResult);
      
    } catch (error) {
      throw new Error(`Failed to fetch: ${error.message}`);
    }
  }

  // Parse by specific retailer
  parseByRetailer($, domain, searchResult) {
    const baseData = {
      url: searchResult.link,
      source: domain,
      pricer: 'AI-Enhanced'
    };

    if (domain.includes('amazon.com')) {
      return { ...baseData, ...this.parseAmazon($) };
    } else if (domain.includes('target.com')) {
      return { ...baseData, ...this.parseTarget($) };
    } else if (domain.includes('walmart.com')) {
      return { ...baseData, ...this.parseWalmart($) };
    } else if (domain.includes('bestbuy.com')) {
      return { ...baseData, ...this.parseBestBuy($) };
    } else if (domain.includes('reebok.com')) {
      return { ...baseData, ...this.parseReebok($) };
    } else if (domain.includes('singer.com')) {
      return { ...baseData, ...this.parseSinger($) };
    } else if (domain.includes('bissell.com')) {
      return { ...baseData, ...this.parseBissell($) };
    } else {
      return { ...baseData, ...this.parseGeneric($) };
    }
  }

  // Amazon parser
  parseAmazon($) {
    return {
      price: this.findPrice($, [
        '#priceblock_dealprice', '#priceblock_ourprice', 
        '.a-price-whole', '.a-offscreen', '[data-asin-price]'
      ]),
      description: this.findText($, ['#productTitle', 'h1']),
      category: this.findText($, ['#wayfinding-breadcrumbs_feature_div', '.nav-breadcrumb']),
      subCategory: this.extractSubCategory($('#wayfinding-breadcrumbs_feature_div').text())
    };
  }

  // Target parser
  parseTarget($) {
    return {
      price: this.findPrice($, [
        '[data-test="product-price"]', '.Price-module__currentPrice___1gVuV'
      ]),
      description: this.findText($, ['[data-test="product-title"]', 'h1']),
      category: this.findText($, ['[data-test="breadcrumb"]', '.Breadcrumb']),
      subCategory: this.extractSubCategory($('[data-test="breadcrumb"]').text())
    };
  }

  // Walmart parser
  parseWalmart($) {
    return {
      price: this.findPrice($, [
        '[data-automation-id="product-price"]', '.notranslate'
      ]),
      description: this.findText($, ['[data-automation-id="product-title"]', 'h1']),
      category: this.findText($, ['.breadcrumb', '[data-testid="breadcrumb"]']),
      subCategory: this.extractSubCategory($('.breadcrumb').text())
    };
  }

  // Best Buy parser
  parseBestBuy($) {
    return {
      price: this.findPrice($, ['.sr-only:contains("current price")', '.pricing-price__range']),
      description: this.findText($, ['.sku-title', 'h1']),
      category: this.findText($, ['.breadcrumb', '.sr-only']),
      subCategory: this.extractSubCategory($('.breadcrumb').text())
    };
  }

  // Generic parser
  parseGeneric($) {
    return {
      price: this.findPrice($, [
        '.price', '.product-price', '[class*="price"]', '[data-price]'
      ]),
      description: this.findText($, [
        'h1', '.product-title', '[class*="title"]', '.product-name'
      ]),
      category: this.categorizeProduct($('title').text() + ' ' + $('h1').text()),
      subCategory: 'Unknown'
    };
  }

  // Reebok parser (best-effort selectors)
  parseReebok($) {
    return {
      price: this.findPrice($, [
        '[data-test="product-price"]', '.gl-price', '.salesprice', '.gl-price-item'
      ]),
      description: this.findText($, ['h1', '[data-test="product-title"]', '.product-title']),
      category: this.categorizeProduct($('title').text() + ' ' + $('h1').text()),
      subCategory: 'Footwear'
    };
  }

  // Singer parser
  parseSinger($) {
    return {
      price: this.findPrice($, ['.price', '[data-product-price]', '.product-price__price']),
      description: this.findText($, ['h1', '.product-title']),
      category: 'Appliances',
      subCategory: 'Sewing Machine'
    };
  }

  // Bissell parser
  parseBissell($) {
    return {
      price: this.findPrice($, ['.price', '.product-price', '[itemprop="price"]']),
      description: this.findText($, ['h1', '.product-title', '[itemprop="name"]']),
      category: 'Appliances',
      subCategory: 'Floor Care'
    };
  }

  // Helper functions
  findPrice($, selectors) {
    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().trim();
        const price = this.extractPrice(text);
        if (price) return price;
      }
    }
    return null;
  }

  findText($, selectors) {
    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 0) return text;
    }
    return 'Unknown';
  }

  extractPrice(text) {
    const match = text.match(/\$[\d,]+\.?\d*/);
    return match ? match[0] : null;
  }

  extractNumericPrice(priceString) {
    if (!priceString) return 0;
    return parseFloat(priceString.replace(/[$,]/g, ''));
  }

  isPriceValid(price, minPrice, maxPrice, operator) {
    switch (operator) {
      case 'less_than':
        return maxPrice ? price < maxPrice : true;
      case 'greater_than':
        return minPrice ? price > minPrice : true;
      case 'between':
        return (!minPrice || price >= minPrice) && (!maxPrice || price <= maxPrice);
      default:
        return true;
    }
  }

  categorizeProduct(text) {
    const lowerText = text.toLowerCase();
    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }
    return 'General';
  }

  extractSubCategory(breadcrumbText) {
    if (!breadcrumbText) return 'Unknown';
    const parts = breadcrumbText.split(/[>\/›]/).map(part => part.trim());
    return parts.length > 1 ? parts[parts.length - 2] : 'Unknown';
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  removeDuplicates(results) {
    const seen = new Set();
    return results.filter(result => {
      if (seen.has(result.link)) return false;
      seen.add(result.link);
      return true;
    });
  }

  formatPriceCriteria(minPrice, maxPrice, operator) {
    switch (operator) {
      case 'less_than':
        return `Less than $${maxPrice}`;
      case 'greater_than':
        return `Greater than $${minPrice}`;
      case 'between':
        return `Between $${minPrice || 0} - $${maxPrice || '∞'}`;
      default:
        return 'Any price';
    }
  }

  formatTableResults(products) {
    return products.map(product => ({
      'Price': product.price || 'N/A',
      'Cat': product.category || 'Unknown',
      'Sub Cat': product.subCategory || 'Unknown', 
      'Source': product.source || 'Unknown',
      'URL': product.url || 'N/A',
      'Pricer': product.pricer || 'AI-Enhanced',
      'Description': product.description || 'No description available'
    }));
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

console.log('✅ ProductValidator loaded successfully');
module.exports = ProductValidator;