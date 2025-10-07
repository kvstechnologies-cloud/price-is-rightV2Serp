const axios = require('axios');

class SerpApiClient {
    constructor() {
        this.apiKey = process.env.SERPAPI_KEY;
        this.baseUrl = 'https://serpapi.com/search';
        this.timeout = parseInt(process.env.REQUEST_TIMEOUT_MS) || 12000;
        
        if (!this.apiKey) {
            console.warn('SERPAPI_KEY not found in environment variables');
        }
    }

    /**
     * Search Google Shopping via SerpAPI
     * @param {string} query - Search query
     * @param {Object} options - Additional search options
     * @returns {Promise<Object>} Search results
     */
    async searchGoogleShopping(query, options = {}) {
        if (!this.apiKey) {
            throw new Error('SerpAPI key not configured');
        }

        const params = {
            engine: 'google_shopping_light',
            q: query,
            api_key: this.apiKey,
            num: options.num || 10,
            ...options
        };

        try {
            const response = await axios.get(this.baseUrl, {
                params,
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Price-Is-Right-App/1.0'
                }
            });

            return this.normalizeShoppingResults(response.data);
        } catch (error) {
            // Check if SerpAPI is down
            if (this.isSerpApiDown(error)) {
                throw new SerpApiDownError('SerpAPI is currently unavailable', error);
            }
            throw error;
        }
    }

    /**
     * Normalize SerpAPI shopping results to consistent format
     * @param {Object} data - Raw SerpAPI response
     * @returns {Object} Normalized results
     */
    normalizeShoppingResults(data) {
        const results = data.shopping_results || [];
        
        return {
            results: results.map(item => ({
                title: item.title || '',
                price: this.parsePrice(item.price),
                currency: item.currency || 'USD',
                source: item.source || '',
                link: item.link || '',
                thumbnail: item.thumbnail || '',
                rating: item.rating || null,
                reviews: item.reviews || null,
                delivery: item.delivery || null,
                serpapi_product_id: item.product_id || null
            })),
            total_results: data.search_information?.total_results || 0,
            search_parameters: data.search_parameters || {},
            error: data.error || null
        };
    }

    /**
     * Parse price string to numeric value
     * @param {string} priceStr - Price string (e.g., "$29.99", "29.99")
     * @returns {number|null} Numeric price or null if unparseable
     */
    parsePrice(priceStr) {
        if (!priceStr) return null;
        
        // Remove currency symbols and extract numeric value
        const cleaned = priceStr.toString().replace(/[$,\s]/g, '');
        const match = cleaned.match(/(\d+\.?\d*)/);
        
        if (match) {
            const price = parseFloat(match[1]);
            return isNaN(price) ? null : price;
        }
        
        return null;
    }

    /**
     * Check if error indicates SerpAPI is down
     * @param {Error} error - Error object
     * @returns {boolean} True if SerpAPI appears to be down
     */
    isSerpApiDown(error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return true; // Timeout
        }
        
        if (error.response) {
            const status = error.response.status;
            // 429 (rate limit), 5xx (server errors), 4xx (client errors that might indicate service issues)
            return status === 429 || status >= 500 || (status >= 400 && status < 500);
        }
        
        return false;
    }

    /**
     * Perform multiple search passes with different queries
     * @param {Array<string>} queries - Array of search queries
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Array of search results for each query
     */
    async multiPassSearch(queries, options = {}) {
        const results = [];
        
        for (const query of queries) {
            try {
                console.log(`SerpAPI search pass: "${query}"`);
                const result = await this.searchGoogleShopping(query, options);
                results.push({
                    query,
                    success: true,
                    data: result,
                    error: null
                });
                
                // ULTRA-FAST: Minimal delay for maximum speed
                await this.delay(10);
            } catch (error) {
                console.error(`SerpAPI search failed for query "${query}":`, error.message);
                results.push({
                    query,
                    success: false,
                    data: null,
                    error: error.message
                });
                
                // If SerpAPI is down, stop trying other queries
                if (error instanceof SerpApiDownError) {
                    console.log('SerpAPI detected as down, stopping multi-pass search');
                    break;
                }
            }
        }
        
        return results;
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
     * Check if SerpAPI is available
     * @returns {Promise<boolean>} True if SerpAPI is available
     */
    async isAvailable() {
        try {
            await this.searchGoogleShopping('test', { num: 1 });
            return true;
        } catch (error) {
            return !this.isSerpApiDown(error);
        }
    }
}

/**
 * Custom error class for SerpAPI downtime
 */
class SerpApiDownError extends Error {
    constructor(message, originalError) {
        super(message);
        this.name = 'SerpApiDownError';
        this.originalError = originalError;
    }
}

module.exports = { SerpApiClient, SerpApiDownError };
