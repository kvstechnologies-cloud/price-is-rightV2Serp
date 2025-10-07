// utils/directUrlResolver.js - Enhanced Direct URL Resolution for Insurance Claims

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Enhanced Direct URL Resolver
 * Converts catalog/search URLs to direct product URLs for "Found" status
 */
class DirectUrlResolver {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 1000;
    this.requestTimeout = 8000;
  }

  /**
   * Main method to resolve catalog URLs to direct product URLs
   */
  async resolveToDirectUrl(catalogUrl, productTitle, retailerSource) {
    try {
      console.log(`🔍 Resolving catalog URL to direct product URL...`);
      console.log(`   Catalog URL: ${catalogUrl}`);
      console.log(`   Product: ${productTitle}`);
      console.log(`   Retailer: ${retailerSource}`);

      // Check cache first
      const cacheKey = `${catalogUrl}|${productTitle}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        console.log(`⚡ Cache hit: ${cached}`);
        return cached;
      }

      // Try retailer-specific resolution
      const directUrl = await this.resolveByRetailer(catalogUrl, productTitle, retailerSource);
      
      if (directUrl && this.isDirectProductUrl(directUrl)) {
        // Cache the result
        this.cacheResult(cacheKey, directUrl);
        console.log(`✅ Resolved to direct URL: ${directUrl}`);
        return directUrl;
      }

      // Fallback: Try to construct direct URL from known patterns
      const constructedUrl = await this.constructDirectUrl(productTitle, retailerSource);
      if (constructedUrl) {
        this.cacheResult(cacheKey, constructedUrl);
        console.log(`✅ Constructed direct URL: ${constructedUrl}`);
        return constructedUrl;
      }

      console.log(`❌ Could not resolve to direct URL`);
      return null;

    } catch (error) {
      console.error(`❌ Error resolving direct URL: ${error.message}`);
      return null;
    }
  }

  /**
   * Retailer-specific URL resolution
   */
  async resolveByRetailer(catalogUrl, productTitle, retailerSource) {
    const retailer = this.identifyRetailer(retailerSource);
    
    switch (retailer) {
      case 'walmart':
        return await this.resolveWalmartUrl(catalogUrl, productTitle);
      case 'target':
        return await this.resolveTargetUrl(catalogUrl, productTitle);
      case 'amazon':
        return await this.resolveAmazonUrl(catalogUrl, productTitle);
      case 'homedepot':
        return await this.resolveHomeDepotUrl(catalogUrl, productTitle);
      case 'lowes':
        return await this.resolveLowesUrl(catalogUrl, productTitle);
      default:
        return await this.resolveGenericUrl(catalogUrl, productTitle);
    }
  }

  /**
   * Resolve Walmart catalog URL to direct product URL
   */
  async resolveWalmartUrl(catalogUrl, productTitle) {
    try {
      // If already a direct Walmart URL, return it
      if (catalogUrl.includes('walmart.com/ip/') && /\/\d+$/.test(catalogUrl)) {
        return catalogUrl;
      }

      // Try to extract product ID from search results
      const response = await axios.get(catalogUrl, {
        timeout: this.requestTimeout,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      const $ = cheerio.load(response.data);
      
      // Look for direct product links in search results
      const productLinks = $('a[href*="/ip/"]').toArray();
      
      for (const link of productLinks) {
        const href = $(link).attr('href');
        if (href && href.includes('/ip/') && /\/\d+/.test(href)) {
          const fullUrl = href.startsWith('http') ? href : `https://www.walmart.com${href}`;
          
          // Verify this link matches our product
          const linkText = $(link).text().toLowerCase();
          if (this.titleMatches(productTitle, linkText)) {
            return fullUrl;
          }
        }
      }

      return null;
    } catch (error) {
      console.log(`⚠️ Walmart URL resolution failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Resolve Target catalog URL to direct product URL
   */
  async resolveTargetUrl(catalogUrl, productTitle) {
    try {
      // If already a direct Target URL, return it
      if (catalogUrl.includes('target.com/p/') && /\/A-\d+/.test(catalogUrl)) {
        return catalogUrl;
      }

      const response = await axios.get(catalogUrl, {
        timeout: this.requestTimeout,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      const $ = cheerio.load(response.data);
      
      // Look for direct product links
      const productLinks = $('a[href*="/p/"]').toArray();
      
      for (const link of productLinks) {
        const href = $(link).attr('href');
        if (href && href.includes('/p/') && /\/A-\d+/.test(href)) {
          const fullUrl = href.startsWith('http') ? href : `https://www.target.com${href}`;
          
          const linkText = $(link).text().toLowerCase();
          if (this.titleMatches(productTitle, linkText)) {
            return fullUrl;
          }
        }
      }

      return null;
    } catch (error) {
      console.log(`⚠️ Target URL resolution failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Resolve Amazon catalog URL to direct product URL
   */
  async resolveAmazonUrl(catalogUrl, productTitle) {
    try {
      // If already a direct Amazon URL, return it
      if (catalogUrl.includes('amazon.com') && /\/dp\/[A-Z0-9]{10}/.test(catalogUrl)) {
        return catalogUrl;
      }

      const response = await axios.get(catalogUrl, {
        timeout: this.requestTimeout,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      const $ = cheerio.load(response.data);
      
      // Look for direct product links
      const productLinks = $('a[href*="/dp/"]').toArray();
      
      for (const link of productLinks) {
        const href = $(link).attr('href');
        if (href && /\/dp\/[A-Z0-9]{10}/.test(href)) {
          const fullUrl = href.startsWith('http') ? href : `https://www.amazon.com${href}`;
          
          const linkText = $(link).text().toLowerCase();
          if (this.titleMatches(productTitle, linkText)) {
            return fullUrl;
          }
        }
      }

      return null;
    } catch (error) {
      console.log(`⚠️ Amazon URL resolution failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Resolve Home Depot catalog URL to direct product URL
   */
  async resolveHomeDepotUrl(catalogUrl, productTitle) {
    try {
      // If already a direct Home Depot URL, return it
      if (catalogUrl.includes('homedepot.com/p/') && /\/\d+$/.test(catalogUrl)) {
        return catalogUrl;
      }

      const response = await axios.get(catalogUrl, {
        timeout: this.requestTimeout,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      const $ = cheerio.load(response.data);
      
      // Look for direct product links
      const productLinks = $('a[href*="/p/"]').toArray();
      
      for (const link of productLinks) {
        const href = $(link).attr('href');
        if (href && href.includes('/p/') && /\/\d+/.test(href)) {
          const fullUrl = href.startsWith('http') ? href : `https://www.homedepot.com${href}`;
          
          const linkText = $(link).text().toLowerCase();
          if (this.titleMatches(productTitle, linkText)) {
            return fullUrl;
          }
        }
      }

      return null;
    } catch (error) {
      console.log(`⚠️ Home Depot URL resolution failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Resolve Lowe's catalog URL to direct product URL
   */
  async resolveLowesUrl(catalogUrl, productTitle) {
    try {
      // If already a direct Lowe's URL, return it
      if (catalogUrl.includes('lowes.com/pd/') && /\/\d+$/.test(catalogUrl)) {
        return catalogUrl;
      }

      const response = await axios.get(catalogUrl, {
        timeout: this.requestTimeout,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      const $ = cheerio.load(response.data);
      
      // Look for direct product links
      const productLinks = $('a[href*="/pd/"]').toArray();
      
      for (const link of productLinks) {
        const href = $(link).attr('href');
        if (href && href.includes('/pd/') && /\/\d+/.test(href)) {
          const fullUrl = href.startsWith('http') ? href : `https://www.lowes.com${href}`;
          
          const linkText = $(link).text().toLowerCase();
          if (this.titleMatches(productTitle, linkText)) {
            return fullUrl;
          }
        }
      }

      return null;
    } catch (error) {
      console.log(`⚠️ Lowe's URL resolution failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Generic URL resolution for other retailers
   */
  async resolveGenericUrl(catalogUrl, productTitle) {
    try {
      const response = await axios.get(catalogUrl, {
        timeout: this.requestTimeout,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      const $ = cheerio.load(response.data);
      
      // Look for product links with common patterns
      const productSelectors = [
        'a[href*="/product/"]',
        'a[href*="/item/"]',
        'a[href*="/p/"]',
        'a[href*="/pd/"]',
        'a[href*="/ip/"]',
        'a[href*="/dp/"]'
      ];

      for (const selector of productSelectors) {
        const links = $(selector).toArray();
        for (const link of links) {
          const href = $(link).attr('href');
          if (href && !href.includes('/search') && !href.includes('/s/')) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, catalogUrl).href;
            
            const linkText = $(link).text().toLowerCase();
            if (this.titleMatches(productTitle, linkText)) {
              return fullUrl;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.log(`⚠️ Generic URL resolution failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Construct direct URL from product title and retailer
   */
  async constructDirectUrl(productTitle, retailerSource) {
    const retailer = this.identifyRetailer(retailerSource);
    
    // For common household items, we can construct likely URLs
    const cleanTitle = this.cleanProductTitle(productTitle);
    
    switch (retailer) {
      case 'walmart':
        return await this.constructWalmartUrl(cleanTitle);
      case 'target':
        return await this.constructTargetUrl(cleanTitle);
      case 'amazon':
        return await this.constructAmazonUrl(cleanTitle);
      default:
        return null;
    }
  }

  /**
   * Construct Walmart URL for common products - NO HARDCODED URLS
   */
  async constructWalmartUrl(cleanTitle) {
    // No hardcoded URLs - return null to force dynamic search
    return null;
  }

  /**
   * Construct Target URL for common products - NO HARDCODED URLS
   */
  async constructTargetUrl(cleanTitle) {
    // No hardcoded URLs - return null to force dynamic search
    return null;
  }

  /**
   * Construct Amazon URL for common products - NO HARDCODED URLS
   */
  async constructAmazonUrl(cleanTitle) {
    // No hardcoded URLs - return null to force dynamic search
    return null;
  }

  /**
   * Check if title matches link text
   */
  titleMatches(productTitle, linkText) {
    if (!productTitle || !linkText) return false;
    
    const titleWords = productTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const linkWords = linkText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    // Check if at least 60% of title words appear in link text
    const matchingWords = titleWords.filter(word => 
      linkWords.some(linkWord => linkWord.includes(word) || word.includes(linkWord))
    );
    
    return matchingWords.length >= Math.ceil(titleWords.length * 0.6);
  }

  /**
   * Identify retailer from source
   */
  identifyRetailer(retailerSource) {
    if (!retailerSource) return 'unknown';
    
    const source = retailerSource.toLowerCase();
    
    if (source.includes('walmart')) return 'walmart';
    if (source.includes('target')) return 'target';
    if (source.includes('amazon')) return 'amazon';
    if (source.includes('homedepot') || source.includes('home depot')) return 'homedepot';
    if (source.includes('lowes') || source.includes('lowe')) return 'lowes';
    if (source.includes('bestbuy') || source.includes('best buy')) return 'bestbuy';
    
    return 'unknown';
  }

  /**
   * Clean product title for URL construction
   */
  cleanProductTitle(title) {
    return title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if URL is a direct product URL
   */
  isDirectProductUrl(url) {
    if (!url) return false;
    
    const directPatterns = [
      /walmart\.com\/ip\/.*\/\d+/,
      /amazon\.com\/.*\/dp\/[A-Z0-9]+/,
      /target\.com\/p\/.*\/A-[\w\-]+/,
      /homedepot\.com\/p\/.*\/\d+/,
      /lowes\.com\/pd\/.*\/\d+/,
      /bestbuy\.com\/site\/.*\/\d+/
    ];
    
    return directPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Cache result
   */
  cacheResult(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

module.exports = DirectUrlResolver;
