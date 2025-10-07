const axios = require('axios');
const cheerio = require('cheerio');

class ProductScraper {
    constructor() {
        this.timeout = parseInt(process.env.REQUEST_TIMEOUT_MS) || 12000;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    }

    /**
     * Scrape product prices from URLs
     * @param {Array} urls - Array of product URLs to scrape
     * @param {Object} facts - Product facts for validation
     * @returns {Promise<Array>} Array of scraped price results
     */
    async scrapeProductPrices(urls, facts) {
        const results = [];
        
        for (const urlData of urls.slice(0, 5)) { // Limit to 5 URLs to avoid timeouts
            try {
                console.log(`Scraping: ${urlData.link}`);
                const priceData = await this.scrapeSingleUrl(urlData.link, urlData.domain);
                
                if (priceData && priceData.price) {
                    results.push({
                        ...priceData,
                        url: urlData.link,
                        domain: urlData.domain,
                        relevanceScore: urlData.relevanceScore || 0,
                        title: urlData.title || priceData.title
                    });
                }
                
                // Delay between requests to be respectful
                await this.delay(500);
            } catch (error) {
                console.error(`Scraping failed for ${urlData.link}:`, error.message);
            }
        }

        return results.sort((a, b) => a.price - b.price); // Sort by price ascending
    }

    /**
     * Scrape a single URL for product price
     * @param {string} url - URL to scrape
     * @param {string} domain - Domain name for selector strategy
     * @returns {Promise<Object|null>} Scraped price data or null
     */
    async scrapeSingleUrl(url, domain) {
        try {
            const response = await axios.get(url, {
                timeout: this.timeout,
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            });

            const $ = cheerio.load(response.data);
            const strategy = this.getScrapingStrategy(domain);
            
            return this.extractPriceData($, strategy, url);
        } catch (error) {
            console.error(`Failed to scrape ${url}:`, error.message);
            return null;
        }
    }

    /**
     * Get scraping strategy based on domain
     * @param {string} domain - Domain name
     * @returns {Object} Scraping selectors and patterns
     */
    getScrapingStrategy(domain) {
        const strategies = {
            'amazon.com': {
                priceSelectors: [
                    '.a-price-whole',
                    '.a-price .a-offscreen',
                    '#priceblock_dealprice',
                    '#priceblock_ourprice',
                    '.a-price-range .a-price .a-offscreen'
                ],
                titleSelectors: ['#productTitle', 'h1.a-size-large'],
                pricePattern: /\$?(\d+\.?\d*)/
            },
            'walmart.com': {
                priceSelectors: [
                    '[data-testid="price-current"]',
                    '.price-current',
                    '[data-automation-id="product-price"]',
                    '.price .visuallyhidden'
                ],
                titleSelectors: ['h1[data-automation-id="product-title"]', 'h1'],
                pricePattern: /\$?(\d+\.?\d*)/
            },
            'target.com': {
                priceSelectors: [
                    '[data-test="product-price"]',
                    '.h-text-red',
                    '.Price-characteristic'
                ],
                titleSelectors: ['h1[data-test="product-title"]', 'h1'],
                pricePattern: /\$?(\d+\.?\d*)/
            },
            'homedepot.com': {
                priceSelectors: [
                    '.price-format__main-price',
                    '.price-detailed__main',
                    '[data-testid="price"]'
                ],
                titleSelectors: ['h1.product-title', 'h1'],
                pricePattern: /\$?(\d+\.?\d*)/
            },
            'lowes.com': {
                priceSelectors: [
                    '.sr-only',
                    '.price-current',
                    '[data-testid="price-current"]'
                ],
                titleSelectors: ['h1.pdp-product-name', 'h1'],
                pricePattern: /\$?(\d+\.?\d*)/
            },
            'bestbuy.com': {
                priceSelectors: [
                    '.sr-only',
                    '.pricing-price__range',
                    '.visuallyhidden'
                ],
                titleSelectors: ['h1.heading-5', 'h1'],
                pricePattern: /\$?(\d+\.?\d*)/
            }
        };

        return strategies[domain] || this.getGenericStrategy();
    }

    /**
     * Get generic scraping strategy for unknown domains
     * @returns {Object} Generic scraping selectors
     */
    getGenericStrategy() {
        return {
            priceSelectors: [
                '.price',
                '.cost',
                '.amount',
                '[class*="price"]',
                '[id*="price"]',
                '.product-price',
                '.current-price'
            ],
            titleSelectors: [
                'h1',
                '.product-title',
                '.product-name',
                '[class*="title"]'
            ],
            pricePattern: /\$?(\d+\.?\d*)/
        };
    }

    /**
     * Extract price data using cheerio and strategy
     * @param {Object} $ - Cheerio instance
     * @param {Object} strategy - Scraping strategy
     * @param {string} url - Original URL
     * @returns {Object|null} Extracted price data
     */
    extractPriceData($, strategy, url) {
        // Try to find price
        let price = null;
        let priceText = '';

        for (const selector of strategy.priceSelectors) {
            const element = $(selector).first();
            if (element.length > 0) {
                priceText = element.text().trim();
                price = this.parsePrice(priceText, strategy.pricePattern);
                if (price) break;
            }
        }

        // If no price found with selectors, try text search
        if (!price) {
            price = this.findPriceInText($.text(), strategy.pricePattern);
        }

        // Try to find title
        let title = '';
        for (const selector of strategy.titleSelectors) {
            const element = $(selector).first();
            if (element.length > 0) {
                title = element.text().trim();
                if (title) break;
            }
        }

        if (!price) {
            return null;
        }

        return {
            price: price,
            title: title || 'Product',
            priceText: priceText,
            url: url,
            scrapedAt: new Date().toISOString()
        };
    }

    /**
     * Parse price from text using pattern
     * @param {string} text - Text containing price
     * @param {RegExp} pattern - Price extraction pattern
     * @returns {number|null} Parsed price or null
     */
    parsePrice(text, pattern) {
        if (!text) return null;
        
        const match = text.match(pattern);
        if (match && match[1]) {
            const price = parseFloat(match[1]);
            return isNaN(price) ? null : price;
        }
        
        return null;
    }

    /**
     * Find price in full page text as fallback
     * @param {string} text - Full page text
     * @param {RegExp} pattern - Price pattern
     * @returns {number|null} Found price or null
     */
    findPriceInText(text, pattern) {
        // Look for common price patterns in text
        const pricePatterns = [
            /\$(\d+\.?\d*)/g,
            /USD\s*(\d+\.?\d*)/g,
            /Price:\s*\$?(\d+\.?\d*)/gi,
            /Cost:\s*\$?(\d+\.?\d*)/gi
        ];

        for (const pricePattern of pricePatterns) {
            const matches = [...text.matchAll(pricePattern)];
            if (matches.length > 0) {
                // Return the first reasonable price (between $0.10 and $10000)
                for (const match of matches) {
                    const price = parseFloat(match[1]);
                    if (!isNaN(price) && price >= 0.10 && price <= 10000) {
                        return price;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Scrape multiple URLs and return best price
     * @param {Array} urls - Array of URLs to scrape
     * @param {Object} facts - Product facts for validation
     * @returns {Promise<Object|null>} Best price result or null
     */
    async getBestPrice(urls, facts) {
        const results = await this.scrapeProductPrices(urls, facts);
        
        if (results.length === 0) {
            return null;
        }

        // Filter results by relevance and price reasonableness
        const validResults = results.filter(result => {
            return result.price >= 0.10 && result.price <= 10000 && result.relevanceScore > 0.2;
        });

        if (validResults.length === 0) {
            // If no valid results, return the cheapest from all results
            return results[0] || null;
        }

        // Return the cheapest valid result
        return validResults.sort((a, b) => a.price - b.price)[0];
    }

    /**
     * Simple delay utility
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Validate scraped price against product facts
     * @param {Object} priceData - Scraped price data
     * @param {Object} facts - Product facts
     * @returns {boolean} True if price seems reasonable
     */
    validatePrice(priceData, facts) {
        if (!priceData || !priceData.price) return false;
        
        const price = priceData.price;
        
        // Basic price range validation
        if (price < 0.10 || price > 10000) return false;
        
        // Category-based validation
        const categoryRanges = {
            'Coolers': { min: 10, max: 500 },
            'Mattress': { min: 50, max: 3000 },
            'Mailbox': { min: 20, max: 800 },
            'Appliances': { min: 50, max: 5000 },
            'Furniture': { min: 30, max: 3000 },
            'Electronics': { min: 20, max: 2000 }
        };

        if (facts.category && categoryRanges[facts.category]) {
            const range = categoryRanges[facts.category];
            return price >= range.min && price <= range.max;
        }

        return true; // If no specific category validation, accept the price
    }
}

module.exports = { ProductScraper };
