const InsuranceItemPricer = require('../models/InsuranceItemPricer');
const axios = require('axios');

class DirectUrlResolver {
  constructor() {
    this.insuranceItemPricer = new InsuranceItemPricer();
    this.resolutionStrategies = [
      'serpapi_product_api',
      'retailer_site_search',
      'web_scraping',
      'ai_enhanced_search'
    ];
  }

  /**
   * Main method to resolve estimated items to found items with direct URLs
   */
  async resolveEstimatedItems(estimatedItems) {
    console.log(`🔍 Starting URL resolution for ${estimatedItems.length} estimated items`);
    
    const results = [];
    const batchSize = 5; // Process in batches to avoid rate limits
    
    for (let i = 0; i < estimatedItems.length; i += batchSize) {
      const batch = estimatedItems.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(estimatedItems.length/batchSize)}`);
      
      const batchPromises = batch.map(item => this.resolveSingleItem(item));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ Failed to resolve item ${batch[index].description}:`, result.reason);
          results.push(batch[index]); // Keep original if resolution fails
        }
      });
      
      // Add delay between batches to be respectful to APIs
      if (i + batchSize < estimatedItems.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const resolvedCount = results.filter(r => r.status === 'Found').length;
    console.log(`✅ Resolution complete: ${resolvedCount}/${estimatedItems.length} items resolved to Found status`);
    
    return results;
  }

  /**
   * Resolve a single estimated item to found status
   */
  async resolveSingleItem(item) {
    console.log(`🔍 Resolving: "${item.description}"`);
    
    // Try each resolution strategy
    for (const strategy of this.resolutionStrategies) {
      try {
        const result = await this.executeStrategy(strategy, item);
        if (result && result.status === 'Found' && result.url && this.isDirectProductUrl(result.url)) {
          console.log(`✅ Resolved via ${strategy}: ${result.url}`);
          return {
            ...item,
            ...result,
            resolutionStrategy: strategy
          };
        }
      } catch (error) {
        console.log(`⚠️ Strategy ${strategy} failed: ${error.message}`);
      }
    }
    
    console.log(`❌ All strategies failed for: "${item.description}"`);
    return item; // Return original item if all strategies fail
  }

  /**
   * Execute a specific resolution strategy
   */
  async executeStrategy(strategy, item) {
    switch (strategy) {
      case 'serpapi_product_api':
        return await this.resolveViaSerpApiProductApi(item);
      
      case 'retailer_site_search':
        return await this.resolveViaRetailerSiteSearch(item);
      
      case 'web_scraping':
        return await this.resolveViaWebScraping(item);
      
      case 'ai_enhanced_search':
        return await this.resolveViaAIEnhancedSearch(item);
      
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }

  /**
   * Strategy 1: Use SerpAPI Product API to get direct URLs
   */
  async resolveViaSerpApiProductApi(item) {
    if (!item.url || !item.url.includes('google.com')) return null;
    
    // Extract product ID from Google Shopping URL if possible
    const productIdMatch = item.url.match(/product\/([^\/]+)/);
    if (!productIdMatch) return null;
    
    const productId = productIdMatch[1];
    console.log(`🔍 Trying SerpAPI Product API for product ID: ${productId}`);
    
    try {
      const productUrl = await this.insuranceItemPricer.getSerpApiProductDetails(productId);
      if (productUrl && this.isDirectProductUrl(productUrl)) {
        return {
          status: 'Found',
          url: productUrl,
          source: this.extractRetailerFromUrl(productUrl),
          price: item.price, // Keep original price for now
          matchQuality: 'Product API Resolution'
        };
      }
    } catch (error) {
      console.log(`⚠️ SerpAPI Product API failed: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Strategy 2: Search retailer sites directly for the product
   */
  async resolveViaRetailerSiteSearch(item) {
    const description = item.description;
    const retailer = item.source;
    
    console.log(`🔍 Searching ${retailer} site for: "${description}"`);
    
    try {
      // Use the existing InsuranceItemPricer to search retailer sites
      const result = await this.insuranceItemPricer.findBestPrice(description, null, 100);
      
      if (result && result.url && this.isDirectProductUrl(result.url)) {
        return {
          status: 'Found',
          url: result.url,
          source: result.source,
          price: result.price || item.price,
          matchQuality: 'Retailer Site Search'
        };
      }
    } catch (error) {
      console.log(`⚠️ Retailer site search failed: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Strategy 3: Web scraping to find direct product URLs
   */
  async resolveViaWebScraping(item) {
    if (!item.url || item.url.includes('google.com')) return null;
    
    console.log(`🔍 Web scraping: ${item.url}`);
    
    try {
      // This would implement web scraping logic
      // For now, return null as this requires more complex implementation
      return null;
    } catch (error) {
      console.log(`⚠️ Web scraping failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Strategy 4: AI-enhanced search with better queries
   */
  async resolveViaAIEnhancedSearch(item) {
    const description = item.description;
    
    console.log(`🔍 AI-enhanced search for: "${description}"`);
    
    try {
      // Create more specific search queries
      const enhancedQueries = this.generateEnhancedQueries(description);
      
      for (const query of enhancedQueries) {
        const result = await this.insuranceItemPricer.findBestPrice(query, null, 100);
        
        if (result && result.url && this.isDirectProductUrl(result.url)) {
          return {
            status: 'Found',
            url: result.url,
            source: result.source,
            price: result.price || item.price,
            matchQuality: 'AI-Enhanced Search'
          };
        }
      }
    } catch (error) {
      console.log(`⚠️ AI-enhanced search failed: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Generate enhanced search queries for better product matching
   */
  generateEnhancedQueries(description) {
    const queries = [description];
    
    // Add brand-specific queries if brand is mentioned
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
    
    return queries.slice(0, 3); // Limit to 3 queries to avoid rate limits
  }

  /**
   * Check if URL is a direct product URL
   */
  isDirectProductUrl(url) {
    return this.insuranceItemPricer.isDirectRetailerProductUrl(url);
  }

  /**
   * Extract retailer name from URL
   */
  extractRetailerFromUrl(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname.includes('walmart.com')) return 'Walmart';
      if (hostname.includes('target.com')) return 'Target';
      if (hostname.includes('homedepot.com')) return 'Home Depot';
      if (hostname.includes('lowes.com')) return "Lowe's";
      if (hostname.includes('bestbuy.com')) return 'Best Buy';
      if (hostname.includes('wayfair.com')) return 'Wayfair';
      if (hostname.includes('amazon.com')) return 'Amazon';
      if (hostname.includes('costco.com')) return 'Costco';
      if (hostname.includes('overstock.com')) return 'Overstock';
      if (hostname.includes('kohls.com')) return "Kohl's";
      return 'Unknown Retailer';
    } catch {
      return 'Unknown Retailer';
    }
  }
}

module.exports = DirectUrlResolver;
