const InsuranceItemPricer = require('../server/models/InsuranceItemPricer');

/**
 * Enhanced Processing Pipeline for 99% Found Status
 * This service enhances the main processing pipeline to be more aggressive
 * about finding direct product URLs instead of search URLs
 */
class EnhancedProcessingPipeline {
  constructor() {
    this.insuranceItemPricer = new InsuranceItemPricer();
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second between retries
  }

  /**
   * Process items with enhanced URL resolution
   */
  async processItemsWithEnhancedResolution(items) {
    console.log(`🚀 Enhanced Processing Pipeline: Processing ${items.length} items`);
    
    const results = [];
    let foundCount = 0;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`\n📦 Processing item ${i + 1}/${items.length}: "${item.description}"`);
      
      try {
        const result = await this.processSingleItemWithRetries(item);
        results.push(result);
        
        if (result.status === 'Found') {
          foundCount++;
          console.log(`✅ Found: ${result.url}`);
        } else {
          console.log(`⚠️ Estimated: ${result.url || 'No URL'}`);
        }
        
        // Add delay to be respectful to APIs
        if (i < items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        console.error(`❌ Failed to process "${item.description}":`, error.message);
        results.push({
          ...item,
          status: 'Estimated',
          url: null,
          source: 'Error Recovery',
          price: item.price || 0
        });
      }
    }
    
    const successRate = ((foundCount / items.length) * 100).toFixed(1);
    console.log(`\n📊 ENHANCED PROCESSING COMPLETE:`);
    console.log(`✅ Found: ${foundCount}/${items.length} items (${successRate}%)`);
    
    return {
      results,
      stats: {
        total: items.length,
        found: foundCount,
        estimated: items.length - foundCount,
        successRate: `${successRate}%`
      }
    };
  }

  /**
   * Process a single item with multiple retry strategies
   */
  async processSingleItemWithRetries(item) {
    const strategies = [
      'direct_search',
      'enhanced_search',
      'retailer_specific_search',
      'fallback_estimation'
    ];
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      for (const strategy of strategies) {
        try {
          console.log(`🔍 Attempt ${attempt + 1}: ${strategy} for "${item.description}"`);
          
          const result = await this.executeStrategy(strategy, item);
          
          if (result && result.status === 'Found' && this.isDirectProductUrl(result.url)) {
            console.log(`✅ Success with ${strategy}: ${result.url}`);
            return {
              ...item,
              ...result,
              strategy: strategy,
              attempt: attempt + 1
            };
          }
          
        } catch (error) {
          console.log(`⚠️ Strategy ${strategy} failed: ${error.message}`);
        }
      }
      
      // Wait before retry
      if (attempt < this.maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
    
    // All strategies failed, return estimated result
    return {
      ...item,
      status: 'Estimated',
      url: this.generateSearchUrl(item),
      source: this.selectBestRetailer(item.description),
      price: item.price || this.estimatePrice(item.description),
      strategy: 'fallback_estimation',
      attempt: this.maxRetries
    };
  }

  /**
   * Execute a specific processing strategy
   */
  async executeStrategy(strategy, item) {
    switch (strategy) {
      case 'direct_search':
        return await this.directSearchStrategy(item);
      
      case 'enhanced_search':
        return await this.enhancedSearchStrategy(item);
      
      case 'retailer_specific_search':
        return await this.retailerSpecificSearchStrategy(item);
      
      case 'fallback_estimation':
        return await this.fallbackEstimationStrategy(item);
      
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }

  /**
   * Strategy 1: Direct search with original description
   */
  async directSearchStrategy(item) {
    const result = await this.insuranceItemPricer.findBestPrice(item.description, null, 100);
    
    if (result && result.url && this.isDirectProductUrl(result.url)) {
      return {
        status: 'Found',
        url: result.url,
        source: result.source,
        price: result.price,
        matchQuality: 'Direct Search'
      };
    }
    
    return null;
  }

  /**
   * Strategy 2: Enhanced search with improved queries
   */
  async enhancedSearchStrategy(item) {
    const enhancedQueries = this.generateEnhancedQueries(item.description);
    
    for (const query of enhancedQueries) {
      const result = await this.insuranceItemPricer.findBestPrice(query, null, 100);
      
      if (result && result.url && this.isDirectProductUrl(result.url)) {
        return {
          status: 'Found',
          url: result.url,
          source: result.source,
          price: result.price,
          matchQuality: 'Enhanced Search'
        };
      }
    }
    
    return null;
  }

  /**
   * Strategy 3: Retailer-specific search
   */
  async retailerSpecificSearchStrategy(item) {
    const retailers = ['Walmart', 'Target', 'Home Depot', 'Amazon', 'Best Buy'];
    
    for (const retailer of retailers) {
      try {
        // Create retailer-specific search
        const retailerQuery = `${item.description} site:${this.getRetailerDomain(retailer)}`;
        const result = await this.insuranceItemPricer.findBestPrice(retailerQuery, null, 100);
        
        if (result && result.url && this.isDirectProductUrl(result.url)) {
          return {
            status: 'Found',
            url: result.url,
            source: retailer,
            price: result.price,
            matchQuality: 'Retailer-Specific Search'
          };
        }
      } catch (error) {
        console.log(`⚠️ Retailer ${retailer} search failed: ${error.message}`);
      }
    }
    
    return null;
  }

  /**
   * Strategy 4: Fallback estimation
   */
  async fallbackEstimationStrategy(item) {
    return {
      status: 'Estimated',
      url: this.generateSearchUrl(item),
      source: this.selectBestRetailer(item.description),
      price: item.price || this.estimatePrice(item.description),
      matchQuality: 'Fallback Estimation'
    };
  }

  /**
   * Generate enhanced search queries
   */
  generateEnhancedQueries(description) {
    const queries = [description];
    
    // Add brand-specific queries
    const brandMatch = description.match(/(\w+)\s+\w+/);
    if (brandMatch) {
      queries.push(`${brandMatch[1]} ${description}`);
    }
    
    // Add model-specific queries
    const modelMatch = description.match(/(\d+[A-Z]?\d*)/);
    if (modelMatch) {
      queries.push(`${description} model ${modelMatch[1]}`);
    }
    
    // Add size-specific queries
    const sizeMatch = description.match(/(\d+["\s]*x\s*\d+["\s]*x?\s*\d*["\s]*)/i);
    if (sizeMatch) {
      queries.push(`${description} ${sizeMatch[1]}`);
    }
    
    return queries.slice(0, 3);
  }

  /**
   * Check if URL is a direct product URL
   */
  isDirectProductUrl(url) {
    return this.insuranceItemPricer.isDirectRetailerProductUrl(url);
  }

  /**
   * Generate search URL for fallback
   */
  generateSearchUrl(item) {
    const retailer = this.selectBestRetailer(item.description);
    const domain = this.getRetailerDomain(retailer);
    const query = encodeURIComponent(item.description);
    
    const searchUrlMap = {
      'walmart.com': `https://www.walmart.com/search?q=${query}`,
      'target.com': `https://www.target.com/s?searchTerm=${query}`,
      'homedepot.com': `https://www.homedepot.com/s/${query}`,
      'amazon.com': `https://www.amazon.com/s?k=${query}`,
      'bestbuy.com': `https://www.bestbuy.com/site/searchpage.jsp?st=${query}`
    };
    
    return searchUrlMap[domain] || `https://www.google.com/search?tbm=shop&q=${query}`;
  }

  /**
   * Select best retailer based on product type
   */
  selectBestRetailer(description) {
    const desc = description.toLowerCase();
    
    if (desc.includes('office') || desc.includes('chair') || desc.includes('desk')) {
      return 'Target';
    } else if (desc.includes('basketball') || desc.includes('sport')) {
      return 'Walmart';
    } else if (desc.includes('hammer') || desc.includes('tool')) {
      return 'Home Depot';
    } else if (desc.includes('electronic') || desc.includes('computer')) {
      return 'Best Buy';
    } else {
      return 'Walmart'; // Default
    }
  }

  /**
   * Get retailer domain
   */
  getRetailerDomain(retailer) {
    const domainMap = {
      'Walmart': 'walmart.com',
      'Target': 'target.com',
      'Home Depot': 'homedepot.com',
      'Amazon': 'amazon.com',
      'Best Buy': 'bestbuy.com'
    };
    
    return domainMap[retailer] || 'walmart.com';
  }

  /**
   * Estimate price based on description
   */
  estimatePrice(description) {
    const desc = description.toLowerCase();
    
    if (desc.includes('chair')) return 150;
    if (desc.includes('desk')) return 200;
    if (desc.includes('basketball')) return 25;
    if (desc.includes('hammer')) return 15;
    if (desc.includes('electronic')) return 300;
    
    return 75; // Default
  }
}

module.exports = EnhancedProcessingPipeline;
