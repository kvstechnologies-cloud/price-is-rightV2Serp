const axios = require('axios');

class GoogleCSEClient {
    constructor() {
        this.apiKey = process.env.GOOGLE_API_KEY;
        this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
        this.baseUrl = 'https://www.googleapis.com/customsearch/v1';
        this.timeout = parseInt(process.env.REQUEST_TIMEOUT_MS) || 12000;
        
        if (!this.apiKey || !this.searchEngineId) {
            console.warn('Google CSE credentials not found in environment variables');
        }
    }

    /**
     * Search using Google Custom Search Engine
     * @param {string} query - Search query
     * @param {Array<string>} trustedDomains - Array of trusted domains to search
     * @param {Object} options - Additional search options
     * @returns {Promise<Object>} Search results
     */
    async searchTrustedSites(query, trustedDomains, options = {}) {
        if (!this.apiKey || !this.searchEngineId) {
            throw new Error('Google CSE credentials not configured');
        }

        const results = [];
        
        // Search each trusted domain
        for (const domain of trustedDomains.slice(0, 5)) { // Limit to first 5 domains to avoid quota issues
            try {
                const siteQuery = `site:${domain} ${query}`;
                console.log(`Google CSE search: "${siteQuery}"`);
                
                const params = {
                    key: this.apiKey,
                    cx: this.searchEngineId,
                    q: siteQuery,
                    num: options.num || 5,
                    ...options
                };

                const response = await axios.get(this.baseUrl, {
                    params,
                    timeout: this.timeout,
                    headers: {
                        'User-Agent': 'Price-Is-Right-App/1.0'
                    }
                });

                const searchResults = this.normalizeCSEResults(response.data, domain);
                results.push(...searchResults);
                
                // Small delay between requests to respect rate limits
                await this.delay(300);
            } catch (error) {
                console.error(`Google CSE search failed for domain ${domain}:`, error.message);
                // Continue with other domains even if one fails
            }
        }

        return {
            results,
            total_results: results.length,
            query: query,
            domains_searched: trustedDomains.slice(0, 5)
        };
    }

    /**
     * Normalize Google CSE results to consistent format
     * @param {Object} data - Raw Google CSE response
     * @param {string} domain - Domain that was searched
     * @returns {Array} Normalized results
     */
    normalizeCSEResults(data, domain) {
        const items = data.items || [];
        
        return items.map(item => ({
            title: item.title || '',
            link: item.link || '',
            snippet: item.snippet || '',
            domain: domain,
            displayLink: item.displayLink || '',
            formattedUrl: item.formattedUrl || '',
            pagemap: item.pagemap || {}
        }));
    }

    /**
     * Search for product across multiple trusted retailers
     * @param {Object} facts - Product facts from vision extraction
     * @param {Array<string>} trustedDomains - Array of trusted domains
     * @returns {Promise<Array>} Array of product URLs to scrape
     */
    async findProductUrls(facts, trustedDomains) {
        const queries = this.buildSearchQueries(facts);
        const allResults = [];

        for (const query of queries) {
            try {
                const searchResult = await this.searchTrustedSites(query, trustedDomains, { num: 3 });
                allResults.push(...searchResult.results);
                
                // If we have enough results, stop searching
                if (allResults.length >= 15) break;
            } catch (error) {
                console.error(`CSE search failed for query "${query}":`, error.message);
            }
        }

        // Filter and deduplicate results
        return this.filterProductUrls(allResults, facts);
    }

    /**
     * Build search queries from product facts
     * @param {Object} facts - Product facts
     * @returns {Array<string>} Array of search queries
     */
    buildSearchQueries(facts) {
        const queries = [];
        
        // Primary queries
        if (facts.brand && facts.model) {
            queries.push(`${facts.brand} ${facts.model}`);
        }
        
        if (facts.brand && facts.title) {
            queries.push(`${facts.brand} ${facts.title}`);
        }
        
        if (facts.title) {
            queries.push(facts.title);
        }
        
        // Secondary queries with attributes
        if (facts.title && facts.attributes && facts.attributes.length > 0) {
            queries.push(`${facts.title} ${facts.attributes[0]}`);
        }
        
        if (facts.category && facts.brand) {
            queries.push(`${facts.category} ${facts.brand}`);
        }

        // Fallback with keywords
        if (facts.keywords && facts.keywords.length > 0) {
            queries.push(facts.keywords[0]);
        }

        return queries.slice(0, 3); // Limit to 3 queries to avoid quota issues
    }

    /**
     * Filter and score product URLs for relevance
     * @param {Array} results - CSE search results
     * @param {Object} facts - Product facts
     * @returns {Array} Filtered and scored URLs
     */
    filterProductUrls(results, facts) {
        const scored = results.map(result => {
            const score = this.scoreResult(result, facts);
            return {
                ...result,
                relevanceScore: score
            };
        });

        // Sort by relevance score and remove duplicates
        const unique = new Map();
        scored.forEach(result => {
            if (!unique.has(result.link) || unique.get(result.link).relevanceScore < result.relevanceScore) {
                unique.set(result.link, result);
            }
        });

        return Array.from(unique.values())
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 10); // Return top 10 most relevant URLs
    }

    /**
     * Score search result relevance
     * @param {Object} result - CSE search result
     * @param {Object} facts - Product facts
     * @returns {number} Relevance score (0-1)
     */
    scoreResult(result, facts) {
        let score = 0;
        const title = result.title.toLowerCase();
        const snippet = result.snippet.toLowerCase();
        const text = `${title} ${snippet}`;

        // Brand match
        if (facts.brand && text.includes(facts.brand.toLowerCase())) {
            score += 0.3;
        }

        // Model match
        if (facts.model && text.includes(facts.model.toLowerCase())) {
            score += 0.2;
        }

        // Title keywords
        if (facts.title) {
            const titleWords = facts.title.toLowerCase().split(' ');
            const matches = titleWords.filter(word => word.length > 2 && text.includes(word));
            score += (matches.length / titleWords.length) * 0.3;
        }

        // Category match
        if (facts.category && text.includes(facts.category.toLowerCase())) {
            score += 0.1;
        }

        // Attributes match
        if (facts.attributes) {
            const attrMatches = facts.attributes.filter(attr => 
                text.includes(attr.toLowerCase())
            );
            score += (attrMatches.length / facts.attributes.length) * 0.1;
        }

        return Math.min(score, 1.0);
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
     * Check if Google CSE is available
     * @returns {Promise<boolean>} True if CSE is available
     */
    async isAvailable() {
        try {
            if (!this.apiKey || !this.searchEngineId) {
                return false;
            }
            
            const params = {
                key: this.apiKey,
                cx: this.searchEngineId,
                q: 'test',
                num: 1
            };

            await axios.get(this.baseUrl, {
                params,
                timeout: 12000
            });
            
            return true;
        } catch (error) {
            console.error('Google CSE availability check failed:', error.message);
            return false;
        }
    }
}

module.exports = { GoogleCSEClient };
