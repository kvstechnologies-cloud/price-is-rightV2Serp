// routes/csvProcessingRoutes.js - ALWAYS SHOW PRICE PIPELINE
const express = require('express');
const axios = require('axios');
const multer = require('multer');
const Papa = require('papaparse');
const XLSX = require('xlsx');
const router = express.Router();
// Domain trust configuration
let UNTRUSTED_DOMAINS = [];
let isTrustedSite = () => true;
try {
  ({ UNTRUSTED_DOMAINS, isTrustedSite } = require('../config/domains'));
  console.log('✅ Domain config loaded for CSV routes');
} catch (e) {
  console.log('⚠️ Domain config not available in CSV routes:', e.message);
}
const gpt5Config = require('../config/gpt5Config');

// Import audit system
let Audit;
try {
  const auditSystem = require('../../src/audit/index.js');
  Audit = auditSystem.Audit;
  console.log('✅ Audit system imported successfully');
} catch (error) {
  console.log('⚠️ Audit system not available:', error.message);
  Audit = null;
}

// NEW: AI Description Enhancement Function for CSV Processing
async function enhanceDescriptionWithAI(description) {
  try {
    // Check if OpenAI is available
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key not available, skipping AI enhancement');
      return description; // Return original description
    }

    console.log(`🤖 CSV AI Enhancement: Enhancing description "${description}"`);
    
    // Create OpenAI client
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const prompt = `You are an expert product researcher for insurance claims. Enhance this product description to make it more searchable and specific for online product searches.

ORIGINAL DESCRIPTION: "${description}"

ENHANCEMENT REQUIREMENTS:
1. Add missing brand names if implied or obvious
2. Include model numbers if mentioned or typical for this product type
3. Add key specifications (size, capacity, material, color, etc.)
4. Use common product naming conventions that retailers use
5. Make it specific enough to find exact matches online
6. Keep it under 100 characters for optimal search results

Return ONLY the enhanced description, no other text or explanations.`;

    const response = await openai.chat.completions.create({
      model: gpt5Config.getTextModel(),
      messages: [
        {
          role: 'system',
          content: 'You are a product description enhancement expert. Return only the enhanced description, no other text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 150
    });

    const enhancedDescription = response.choices[0].message.content.trim();
    console.log(`✅ CSV AI Enhancement: "${description}" → "${enhancedDescription}"`);
    
    return enhancedDescription;
    
  } catch (error) {
    console.error('❌ CSV AI description enhancement failed:', error.message);
    return description; // Fallback to original description
  }
}

// NEW: Enhanced Search with AI Description Enhancement
async function enhancedSearchWithAI(description, targetPrice) {
  try {
    console.log(`🔍 Enhanced Search with AI: "${description}"`);
    
    // STEP 1: AI Description Enhancement BEFORE search
    const enhancedDescription = await enhanceDescriptionWithAI(description);
    
    // STEP 2: Use enhanced description for search
    const searchQuery = enhancedDescription;
    console.log(`🤖 Using AI-enhanced description for search: "${searchQuery}"`);
    
    // STEP 3: Build optimized search queries with enhanced description
    const queries = buildSerpQueries({
      title: searchQuery,
      brand: null,
      model: null,
      category: 'HSW',
      subcategory: 'General'
    });
    
    console.log(`🔍 Built ${queries.length} AI-enhanced search queries:`, queries);
    
    // STEP 4: Execute search with enhanced queries
    if (serpApiClient) {
      try {
        const searchResults = await serpApiClient.multiPassSearch(queries);
        console.log(`✅ AI-enhanced search completed with ${searchResults.length} queries`);
        
        // Process results and ensure no extremely low prices
        const processedResults = processSearchResults(searchResults, enhancedDescription, targetPrice);
        return processedResults;
        
      } catch (error) {
        console.error('❌ AI-enhanced search failed:', error.message);
        // Fallback to basic search
        return await fallbackSearch(enhancedDescription, targetPrice);
      }
    } else {
      console.log('⚠️ SerpAPI client not available, using fallback search');
      return await fallbackSearch(enhancedDescription, targetPrice);
    }
    
  } catch (error) {
    console.error('❌ Enhanced search with AI failed:', error.message);
    // Final fallback
    return await fallbackSearch(description, targetPrice);
  }
}

// NEW: Process Search Results and Block Extremely Low Prices
function processSearchResults(searchResults, description, targetPrice) {
  try {
    let allResults = [];
    
    // Collect all results from all queries
    searchResults.forEach(searchResult => {
      if (searchResult.success && searchResult.data && searchResult.data.results) {
        const validResults = searchResult.data.results.filter(result => {
          // BLOCK only extremely low prices (less than $0.10) to avoid obvious errors
          if (result.price && result.numericPrice < 0.10) {
            console.log(`🚫 BLOCKED EXTREMELY LOW PRICE: ${result.title} at $${result.price}`);
            return false;
          }
          
          // BLOCK prices that are suspiciously low compared to target (less than 1% of target)
          if (targetPrice && result.numericPrice < (targetPrice * 0.01)) {
            console.log(`🚫 BLOCKED SUSPICIOUS PRICE: ${result.title} at $${result.price} (target: $${targetPrice})`);
            return false;
          }
          
          // Only allow trusted sources and trusted link domains
          const sourceOk = result.source && isTrustedSource(result.source);
          if (!sourceOk) return false;
          if (result.link) {
            try {
              const linkDomain = result.link
                .toLowerCase()
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .split('/')[0];
              // Block if domain is known untrusted
              if (UNTRUSTED_DOMAINS && UNTRUSTED_DOMAINS.includes(linkDomain)) {
                console.log(`🚫 BLOCKED UNTRUSTED LINK DOMAIN: ${linkDomain} for ${result.title}`);
                return false;
              }
            } catch (_) {}
          }
          return true;
        });
        
        allResults.push(...validResults);
      }
    });
    
    console.log(`🔍 Processed ${allResults.length} valid results (blocked suspicious prices)`);
    
    if (allResults.length === 0) {
      console.log('⚠️ No valid results after price filtering, using fallback');
      return {
        found: false,
        status: 'no_valid_prices',
        explanation: 'All search results had suspiciously low prices and were blocked. Using fallback pricing.',
        searchQuery: description,
        targetPrice: targetPrice
      };
    }
    
    // Score and rank the valid results
    const scoredResults = scoreResults(allResults, { title: description });
    const bestResult = scoredResults[0];
    
    return {
      found: true,
      price: bestResult.numericPrice,
      source: bestResult.source,
      url: bestResult.link,
      category: 'HSW',
      subcategory: 'General',
      description: bestResult.title,
      isEstimated: false,
      matchQuality: 'AI-Enhanced Search',
      status: 'found',
      explanation: `Found product using AI-enhanced description: ${bestResult.title}`,
      matchedAttributes: {
        brand: bestResult.brand || 'unknown',
        model: bestResult.model || 'unknown',
        confidence: bestResult.similarityScore || 0.7
      }
    };
    
  } catch (error) {
    console.error('❌ Error processing search results:', error.message);
    return {
      found: false,
      status: 'processing_error',
      explanation: `Error processing search results: ${error.message}`,
      searchQuery: description,
      targetPrice: targetPrice
    };
  }
}

// NEW: Fallback Search (No Extremely Low Prices)
async function fallbackSearch(description, targetPrice) {
  try {
    console.log(`🔄 Fallback search for: "${description}"`);
    
    // Create Google Shopping search URL
    const searchUrl = null;
    
    // Return structured result with target price (never extremely low)
    return {
      found: true,
      price: targetPrice || 100, // Use target price, never extremely low
      source: 'Google Shopping Fallback',
      url: searchUrl,
      category: 'HSW',
      subcategory: 'General',
      description: description,
      isEstimated: true,
      matchQuality: 'Fallback Search',
      status: 'price_estimated',
      explanation: 'Using fallback search with target price as base',
      matchedAttributes: {
        brand: 'unknown',
        model: 'unknown',
        confidence: 0.5
      }
    };
    
  } catch (error) {
    console.error('❌ Fallback search failed:', error.message);
    // Final fallback - use target price but never extremely low
    return {
      found: true,
      price: targetPrice || 100,
      source: 'Purchase Price Fallback',
      url: null,
      category: 'HSW',
      subcategory: 'Google Shopping',
      description: description,
      isEstimated: true,
      matchQuality: 'Purchase Price Used',
      status: 'price_estimated',
      explanation: 'Using purchase price as final fallback',
      matchedAttributes: {
        brand: 'unknown',
        model: 'unknown',
        confidence: 0.3
      }
    };
  }
}

// Import always show price pipeline components
console.log('🔍 Loading pipeline components...');
let SerpApiClient, SerpApiDownError, GoogleCSEClient, ProductScraper, buildSerpQueries, scoreResults, estimateFromBaseline, TRUSTED_DOMAINS, isTrustedSource, normalizeSearchQuery, PriceToleranceValidator;

try {
  ({ SerpApiClient, SerpApiDownError } = require('../utils/serpApiClient'));
  console.log('✅ SerpApiClient loaded');
} catch (error) {
  console.error('❌ Failed to load SerpApiClient:', error.message);
}

try {
  ({ GoogleCSEClient } = require('../utils/search_cse'));
  console.log('✅ GoogleCSEClient loaded');
} catch (error) {
  console.error('❌ Failed to load GoogleCSEClient:', error.message);
}

try {
  ({ ProductScraper } = require('../utils/scraper_logic'));
  console.log('✅ ProductScraper loaded');
} catch (error) {
  console.error('❌ Failed to load ProductScraper:', error.message);
}

try {
  ({ buildSerpQueries } = require('../utils/queryBuilder'));
  console.log('✅ buildSerpQueries loaded');
} catch (error) {
  console.error('❌ Failed to load buildSerpQueries:', error.message);
}

try {
  ({ scoreResults } = require('../utils/similarity'));
  console.log('✅ scoreResults loaded');
} catch (error) {
  console.error('❌ Failed to load scoreResults:', error.message);
}

try {
  ({ estimateFromBaseline } = require('../utils/category_baselines'));
  console.log('✅ estimateFromBaseline loaded');
} catch (error) {
  console.error('❌ Failed to load estimateFromBaseline:', error.message);
}

try {
  ({ TRUSTED_DOMAINS, isTrustedSource } = require('../utils/trusted_sources_new'));
  console.log('✅ TRUSTED_DOMAINS loaded');
} catch (error) {
  console.error('❌ Failed to load TRUSTED_DOMAINS:', error.message);
}

try {
  ({ normalizeSearchQuery } = require('../utils/TextNormalization'));
  console.log('✅ normalizeSearchQuery loaded');
} catch (error) {
  console.error('❌ Failed to load normalizeSearchQuery:', error.message);
}

try {
  ({ PriceToleranceValidator } = require('../utils/priceToleranceValidator'));
  console.log('✅ PriceToleranceValidator loaded');
} catch (error) {
  console.error('❌ Failed to load PriceToleranceValidator:', error.message);
}

// Initialize pipeline components
let serpApiClient, googleCSEClient, productScraper;

try {
  if (SerpApiClient) {
    serpApiClient = new SerpApiClient();
    console.log('✅ serpApiClient initialized');
  }
} catch (error) {
  console.error('❌ Failed to initialize serpApiClient:', error.message);
}

try {
  if (GoogleCSEClient) {
    googleCSEClient = new GoogleCSEClient();
    console.log('✅ googleCSEClient initialized');
  }
} catch (error) {
  console.error('❌ Failed to initialize googleCSEClient:', error.message);
}

try {
  if (ProductScraper) {
    productScraper = new ProductScraper();
    console.log('✅ productScraper initialized');
  }
} catch (error) {
  console.error('❌ Failed to initialize productScraper:', error.message);
}

/**
 * Always Show Price Pipeline for CSV items
 * Follows the exact specification: SerpAPI → Fallback → Backstops
 */
async function alwaysShowPricePipeline(facts, targetPrice = null) {
  console.log(`🔄 Starting always show price pipeline for:`, facts);
  
  try {
    // Step 1: Build search queries (5-pass strategy)
    const queries = buildSerpQueries(facts);
    console.log(`🔍 Built ${queries.length} search queries:`, queries);
    
    // Step 2: Try SerpAPI first (primary path)
    let serpApiDown = false;
    let serpSearchResults = [];
    
    try {
      serpSearchResults = await serpApiClient.multiPassSearch(queries);
      
      // Check if any searches succeeded
      const successfulSearches = serpSearchResults.filter(r => r.success);
      if (successfulSearches.length === 0) {
        throw new SerpApiDownError('All SerpAPI searches failed');
      }
      
      console.log(`✅ SerpAPI returned results from ${successfulSearches.length} successful searches`);
      
    } catch (error) {
      if (error instanceof SerpApiDownError || serpApiClient.isSerpApiDown(error)) {
        console.log(`⚠️ SerpAPI is down, will use fallback path`);
        serpApiDown = true;
      } else {
        console.error(`❌ SerpAPI error:`, error.message);
        serpApiDown = true;
      }
    }
    
          // Step 3: Process SerpAPI results if available
      if (!serpApiDown && serpSearchResults.length > 0) {
        // Collect ALL results from ALL queries to find the absolute lowest price
        let allTrustedResults = [];
        
        // Process all successful searches and collect results
        const successfulSearches = serpSearchResults.filter(r => r.success);
        successfulSearches.forEach(searchResult => {
          if (searchResult.data && searchResult.data.results) {
            console.log(`🔍 DEBUG: Raw SerpAPI results for query:`, searchResult.data.results.map(r => ({
              title: r.title,
              source: r.source,
              price: r.price,
              link: r.link,
              hasLink: !!r.link,
              linkLength: r.link ? r.link.length : 0,
              linkType: r.link ? typeof r.link : 'undefined'
            })));
            
            // Log the first result in detail
            if (searchResult.data.results.length > 0) {
              const firstResult = searchResult.data.results[0];
              console.log(`🔍 DETAILED FIRST RESULT:`, {
                title: firstResult.title,
                source: firstResult.source,
                price: firstResult.price,
                link: firstResult.link,
                allKeys: Object.keys(firstResult)
              });
            }
            
            const trustedResultsFromQuery = searchResult.data.results
              .filter(result => {
                const isTrusted = result.source && isTrustedSource(result.source);
                if (!isTrusted) {
                  console.log(`🚫 UNTRUSTED SOURCE: ${result.source} for ${result.title}`);
                }
                return isTrusted;
              })
              .filter(result => result.price && result.price > 0)
              // NEW: Block only extremely low prices (less than $0.10) to avoid obvious errors
              .filter(result => {
                const price = parseFloat(result.price.toString().replace(/[$,]/g, ''));
                if (price < 0.10) {
                  console.log(`🚫 BLOCKED EXTREMELY LOW PRICE: ${result.title} at $${result.price}`);
                  return false;
                }
                if (targetPrice && price < (targetPrice * 0.01)) {
                  console.log(`🚫 BLOCKED SUSPICIOUS PRICE: ${result.title} at $${result.price} (target: $${targetPrice})`);
                  return false;
                }
                return true;
              });
            allTrustedResults.push(...trustedResultsFromQuery);
          }
        });
      
      console.log(`🔍 Collected ${allTrustedResults.length} trusted results from all queries`);
      
      if (allTrustedResults.length > 0) {
        // Score all results for similarity
        const scoredResults = scoreResults(allTrustedResults, facts);
        console.log(`📊 Scored ${scoredResults.length} results`);
        
        // Strategy 1: Look for exact/similar matches first (score >= 0.45)
        const exactMatches = scoredResults.filter(r => r.similarityScore >= 0.45);
        
        if (exactMatches.length > 0) {
          // Found exact/similar matches - return lowest price among them
          const bestMatch = exactMatches.sort((a, b) => a.price - b.price)[0];
          const adjustedPrice = bestMatch.price; // No condition adjustments - always price for NEW items
          
          console.log(`✅ Found exact match: ${bestMatch.title} at $${bestMatch.price} from ${bestMatch.source}`);
          
          // Try to resolve a direct merchant URL for this result
          const resolvedUrl = await (async () => {
            try {
              // Prefer product_id-based lookup if present
              if (bestMatch.product_id && process.env.SERPAPI_KEY) {
                const resp = await axios.get('https://serpapi.com/search.json', {
                  params: {
                    engine: 'google_product',
                    product_id: bestMatch.product_id,
                    api_key: process.env.SERPAPI_KEY,
                    gl: 'us',
                    hl: 'en'
                  },
                  timeout: 10000
                });
                const listings = resp.data && resp.data.sellers_results_to_listing ? resp.data.sellers_results_to_listing : [];
                const sellers = [].concat(...listings.map(l => l.sellers || []));
                const trustedOffer = sellers.find(s => s.link && isTrustedSite((s.domain || s.link)));
                if (trustedOffer && trustedOffer.link) {
                  return trustedOffer.link;
                }
              }
              // Otherwise, attempt to resolve redirects on the link we have
              if (bestMatch.link) {
                const res = await axios.get(bestMatch.link, {
                  maxRedirects: 5,
                  timeout: 8000,
                  validateStatus: s => s >= 200 && s < 400
                });
                const finalUrl = (res.request && res.request.res && res.request.res.responseUrl) ? res.request.res.responseUrl : bestMatch.link;
                return finalUrl;
              }
            } catch (e) {
              console.log('⚠️ URL resolution failed:', e.message);
            }
            return null;
          })();

          return {
            status: 'FOUND',
            pricingTier: 'SERP',
            basePrice: bestMatch.price,
            adjustedPrice: adjustedPrice,
            currency: 'USD',
            source: bestMatch.source,
            url: (() => {
                console.log(`🔍 CSV URL DEBUG - Source: ${bestMatch.source}, Link: ${bestMatch.link}`);
                
                // If we have a direct product URL from SerpAPI, use it
                if (resolvedUrl && resolvedUrl.trim() !== '') {
                  console.log(`🔗 CSV URL DEBUG - Using resolved direct URL: ${resolvedUrl}`);
                  return resolvedUrl;
                } else if (bestMatch.link && bestMatch.link.trim() !== '') {
                  // Check if it's a Google Shopping redirect URL that we should replace
                  if (bestMatch.link.includes('google.com/shopping') || bestMatch.link.includes('googleadservices.com')) {
                    console.log(`🔍 CSV URL DEBUG - Google Shopping redirect detected, creating retailer search URL`);
                    const retailerDomain = bestMatch.source.toLowerCase().replace(/\s+/g, '') + '.com';
                    const directUrl = insuranceItemPricer.createRetailerSearchUrl(facts.title, retailerDomain);
                    console.log(`🔗 CSV URL DEBUG - Replacing with: ${directUrl}`);
                    return directUrl;
                  } else {
                    // Use the direct product URL from SerpAPI
                    console.log(`🔗 CSV URL DEBUG - Using direct product URL: ${bestMatch.link}`);
                    return bestMatch.link;
                  }
                } else {
                  // No URL available, create a retailer search URL
                  console.log(`🔍 CSV URL DEBUG - No URL available, creating retailer search URL`);
                  const retailerDomain = bestMatch.source.toLowerCase().replace(/\s+/g, '') + '.com';
                  const directUrl = insuranceItemPricer.createRetailerSearchUrl(facts.title, retailerDomain);
                  console.log(`🔗 CSV URL DEBUG - Created search URL: ${directUrl}`);
                  return directUrl;
                }
              })(),
            pricer: 'AI-Enhanced',
            confidence: Math.min(facts.confidence + (bestMatch.similarityScore * 0.3), 1.0),
            notes: `Found exact match: ${bestMatch.title}`
          };
        } else {
          // Strategy 2: No exact matches - use ABSOLUTE LOWEST price from ALL trusted results
          // This ensures users can actually find this price when they search Google Shopping
          const absoluteLowest = allTrustedResults.reduce((min, current) => 
            current.price < min.price ? current : min
          );
          
          const adjustedPrice = absoluteLowest.price; // No condition adjustments - always price for NEW items
          
          console.log(`💰 Using absolute lowest price: ${absoluteLowest.title} at $${absoluteLowest.price} from ${absoluteLowest.source}`);
          
          // Resolve direct merchant URL similarly for absoluteLowest
          const resolvedAbsoluteUrl = await (async () => {
            try {
              if (absoluteLowest.product_id && process.env.SERPAPI_KEY) {
                const resp = await axios.get('https://serpapi.com/search.json', {
                  params: {
                    engine: 'google_product',
                    product_id: absoluteLowest.product_id,
                    api_key: process.env.SERPAPI_KEY,
                    gl: 'us',
                    hl: 'en'
                  },
                  timeout: 10000
                });
                const listings = resp.data && resp.data.sellers_results_to_listing ? resp.data.sellers_results_to_listing : [];
                const sellers = [].concat(...listings.map(l => l.sellers || []));
                const trustedOffer = sellers.find(s => s.link && isTrustedSite((s.domain || s.link)));
                if (trustedOffer && trustedOffer.link) {
                  return trustedOffer.link;
                }
              }
              if (absoluteLowest.link) {
                const res = await axios.get(absoluteLowest.link, {
                  maxRedirects: 5,
                  timeout: 8000,
                  validateStatus: s => s >= 200 && s < 400
                });
                const finalUrl = (res.request && res.request.res && res.request.res.responseUrl) ? res.request.res.responseUrl : absoluteLowest.link;
                return finalUrl;
              }
            } catch (e) {
              console.log('⚠️ URL resolution failed (absolute):', e.message);
            }
            return null;
          })();

          return {
            status: 'FOUND',
            pricingTier: 'SERP',
            basePrice: absoluteLowest.price,
            adjustedPrice: adjustedPrice,
            currency: 'USD',
            source: absoluteLowest.source,
            url: (() => {
                console.log(`🔍 CSV URL DEBUG (absolute) - Source: ${absoluteLowest.source}, Link: ${absoluteLowest.link}`);
                
                // If we have a direct product URL from SerpAPI, use it
                if (resolvedAbsoluteUrl && resolvedAbsoluteUrl.trim() !== '') {
                  console.log(`🔗 CSV URL DEBUG (absolute) - Using resolved direct URL: ${resolvedAbsoluteUrl}`);
                  return resolvedAbsoluteUrl;
                } else if (absoluteLowest.link && absoluteLowest.link.trim() !== '') {
                  // Check if it's a Google Shopping redirect URL that we should replace
                  if (absoluteLowest.link.includes('google.com/shopping') || absoluteLowest.link.includes('googleadservices.com')) {
                    console.log(`🔍 CSV URL DEBUG (absolute) - Google Shopping redirect detected, creating retailer search URL`);
                    const retailerDomain = absoluteLowest.source.toLowerCase().replace(/\s+/g, '') + '.com';
                    const directUrl = insuranceItemPricer.createRetailerSearchUrl(facts.title, retailerDomain);
                    console.log(`🔗 CSV URL DEBUG (absolute) - Replacing with: ${directUrl}`);
                    return directUrl;
                  } else {
                    // Use the direct product URL from SerpAPI
                    console.log(`🔗 CSV URL DEBUG (absolute) - Using direct product URL: ${absoluteLowest.link}`);
                    return absoluteLowest.link;
                  }
                } else {
                  // No URL available, create a retailer search URL
                  console.log(`🔍 CSV URL DEBUG (absolute) - No URL available, creating retailer search URL`);
                  const retailerDomain = absoluteLowest.source.toLowerCase().replace(/\s+/g, '') + '.com';
                  const directUrl = insuranceItemPricer.createRetailerSearchUrl(facts.title, retailerDomain);
                  console.log(`🔗 CSV URL DEBUG (absolute) - Created search URL: ${directUrl}`);
                  return directUrl;
                }
              })(),
            pricer: 'AI-Enhanced',
            confidence: Math.min(facts.confidence + 0.2, 1.0),
            notes: `Lowest price from ${allTrustedResults.length} trusted sources: ${absoluteLowest.title}`
          };
        }
      }
    }
    
    // Step 4: Fallback path (only if SerpAPI is down)
    if (serpApiDown && process.env.ENABLE_FALLBACK === 'true') {
      console.log(`🔄 Using fallback path (Google CSE + scraping)`);
      
      try {
        // Find product URLs using Google CSE
        const productUrls = await googleCSEClient.findProductUrls(facts, TRUSTED_DOMAINS);
        console.log(`🔍 Found ${productUrls.length} product URLs to scrape`);
        
        if (productUrls.length > 0) {
          // Scrape prices from found URLs
          const scrapedResults = await productScraper.getBestPrice(productUrls, facts);
          
          if (scrapedResults && scrapedResults.price) {
            const adjustedPrice = scrapedResults.price; // No condition adjustments - always price for NEW items
            
            return {
              status: 'FOUND',
              pricingTier: 'FALLBACK',
              basePrice: scrapedResults.price,
              adjustedPrice: adjustedPrice,
              currency: 'USD',
              source: scrapedResults.domain,
              url: scrapedResults.url,
              pricer: 'AI-Enhanced',
              confidence: Math.min(facts.confidence + 0.1, 1.0),
              notes: `Scraped from ${scrapedResults.domain}`
            };
          }
        }
      } catch (fallbackError) {
        console.error(`❌ Fallback path failed:`, fallbackError.message);
      }
    }
    
    // Step 5: Final backstop - category baseline (guarantees a price)
    console.log(`🔄 Using category baseline as final backstop`);
    const baselineResult = estimateFromBaseline(facts);
    
    return {
      status: 'ESTIMATED',
      pricingTier: 'BASELINE',
      basePrice: baselineResult.basePrice,
      adjustedPrice: baselineResult.adjustedPrice,
      currency: 'USD',
      source: 'Category Baseline',
      url: null,
      pricer: 'AI-Enhanced',
      confidence: baselineResult.confidence,
      notes: baselineResult.notes
    };
    
  } catch (error) {
    console.error(`❌ Pipeline error:`, error.message);
    
    // Emergency fallback - still guarantee a price
    const emergencyResult = estimateFromBaseline(facts);
    
    return {
      status: 'ESTIMATED',
      pricingTier: 'BASELINE',
      basePrice: emergencyResult.basePrice,
      adjustedPrice: emergencyResult.adjustedPrice,
      currency: 'USD',
      source: 'Emergency Baseline',
      url: null,
      pricer: 'AI-Enhanced',
      confidence: 0.2,
      notes: `Emergency fallback: ${error.message}`
    };
  }
}

/**
 * Apply condition adjustments to base price
 * poor: -70%, fair: -40%, good: -20%
 * damage: additional -50%
 */
// REMOVED: applyConditionAdjustments function - no more condition adjustments
// Always price for NEW products as requested by user

/**
 * Convert CSV row to structured facts format
 */
function csvRowToFacts(row, columnMap) {
  const itemDesc = getField(row, [columnMap.itemDescription, 'Item Description', 'Description']) || '';
  let brand = getField(row, [columnMap.brand, 'Brand', 'Manufacturer', 'Brand or Manufacturer']) || '';
  const model = getField(row, [columnMap.model, 'Model#', 'Model']) || '';
  const category = getField(row, [columnMap.category, 'Category']) || '';
  const subcategory = getField(row, [columnMap.subcategory, 'Subcategory', 'Sub Cat']) || '';
  const condition = getField(row, ['Condition']) || 'good';
  const room = getField(row, [columnMap.room, 'Room', 'Location']) || '';
  
  // Handle "No Brand" cases - treat as empty per user request
  if (brand && (brand.toLowerCase() === 'no brand' || brand.toLowerCase() === 'nobrand' || brand.toLowerCase() === 'unknown' || brand.toLowerCase() === 'generic')) {
    brand = '';
  }
  
  // Extract attributes from description with enhanced style detection
  const attributes = [];
  const lowerDesc = itemDesc.toLowerCase();
  
  // Enhanced size/capacity patterns
  const sizeMatch = lowerDesc.match(/(\d+(?:\.\d+)?)\s*(?:inch|"|in|cu\.?\s*ft\.?|cuft|cu\s*ft|quart|qt|gallon|gal|liter|litre|ml|oz|ounce)/i);
  if (sizeMatch) {
    attributes.push(sizeMatch[0]);
  }
  
  // Enhanced color patterns including finishes
  const colorMatch = lowerDesc.match(/\b(black|white|silver|stainless|steel|chrome|bronze|brass|copper|gold|red|blue|green|yellow|orange|purple|pink|gray|grey|brown|beige|tan|ivory|cream|navy|maroon|teal|turquoise)\b/i);
  if (colorMatch) {
    attributes.push(colorMatch[0]);
  }
  
  // Enhanced material patterns
  const materialMatch = lowerDesc.match(/\b(plastic|metal|aluminum|steel|wood|glass|ceramic|fabric|leather|vinyl|rubber|silicone|bamboo|marble|granite|quartz|stone|concrete|fiberglass|carbon|fiber)\b/i);
  if (materialMatch) {
    attributes.push(materialMatch[0]);
  }
  
  // Style-specific attribute extraction (focus on style part per user request)
  const styleAttributes = [];
  
  // Architectural/Design styles
  const styleMatch = lowerDesc.match(/\b(victorian|modern|contemporary|traditional|rustic|industrial|minimalist|vintage|antique|classic|colonial|craftsman|art\s*deco|mid\s*century|farmhouse|shabby\s*chic|bohemian|scandinavian|mediterranean|french|italian|english|american|asian|oriental)\b/gi);
  if (styleMatch) {
    styleMatch.forEach(style => styleAttributes.push(style.toLowerCase()));
  }
  
  // Finish styles
  const finishMatch = lowerDesc.match(/\b(matte|glossy|satin|brushed|polished|textured|smooth|rough|distressed|weathered|aged|patina|oxidized|powder\s*coated|painted|stained|lacquered|varnished)\b/gi);
  if (finishMatch) {
    finishMatch.forEach(finish => styleAttributes.push(finish.toLowerCase()));
  }
  
  // Shape/Form styles
  const shapeMatch = lowerDesc.match(/\b(round|square|rectangular|oval|circular|triangular|hexagonal|curved|straight|angular|streamlined|sleek|bulky|compact|slim|wide|narrow|tall|short)\b/gi);
  if (shapeMatch) {
    shapeMatch.forEach(shape => styleAttributes.push(shape.toLowerCase()));
  }
  
  // Add style attributes to main attributes array
  attributes.push(...styleAttributes);
  
  // Generate keywords from title
  const keywords = itemDesc
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !['the', 'and', 'with', 'for'].includes(word))
    .slice(0, 5);
  
  // Determine category if not provided (enhanced with room context)
  let finalCategory = category;
  if (!finalCategory) {
    const lowerRoom = room.toLowerCase();
    
    // Use room context to improve category detection
    if (lowerRoom.includes('kitchen')) {
      if (lowerDesc.includes('refrigerator') || lowerDesc.includes('fridge')) {
        finalCategory = 'Appliances';
      } else if (lowerDesc.includes('mixer') || lowerDesc.includes('blender')) {
        finalCategory = 'Kitchen';
      } else if (lowerDesc.includes('microwave') || lowerDesc.includes('toaster')) {
        finalCategory = 'Kitchen';
      } else {
        finalCategory = 'Kitchen';
      }
    } else if (lowerRoom.includes('bathroom') || lowerRoom.includes('bath')) {
      if (lowerDesc.includes('mirror')) {
        finalCategory = 'Bathroom';
      } else if (lowerDesc.includes('towel') || lowerDesc.includes('mat')) {
        finalCategory = 'Bathroom';
      } else {
        finalCategory = 'Bathroom';
      }
    } else if (lowerRoom.includes('bedroom') || lowerRoom.includes('bed')) {
      if (lowerDesc.includes('mattress') || lowerDesc.includes('bed')) {
        finalCategory = 'Furniture';
      } else if (lowerDesc.includes('dresser') || lowerDesc.includes('nightstand')) {
        finalCategory = 'Furniture';
      } else {
        finalCategory = 'Furniture';
      }
    } else if (lowerRoom.includes('living') || lowerRoom.includes('family')) {
      if (lowerDesc.includes('tv') || lowerDesc.includes('television')) {
        finalCategory = 'Electronics';
      } else if (lowerDesc.includes('sofa') || lowerDesc.includes('chair')) {
        finalCategory = 'Furniture';
      } else {
        finalCategory = 'Furniture';
      }
    } else if (lowerRoom.includes('office') || lowerRoom.includes('study')) {
      if (lowerDesc.includes('laptop') || lowerDesc.includes('computer')) {
        finalCategory = 'Electronics';
      } else if (lowerDesc.includes('desk') || lowerDesc.includes('chair')) {
        finalCategory = 'Office';
      } else {
        finalCategory = 'Office';
      }
    } else if (lowerRoom.includes('garage') || lowerRoom.includes('basement')) {
      if (lowerDesc.includes('tool') || lowerDesc.includes('drill')) {
        finalCategory = 'Tools';
      } else if (lowerDesc.includes('storage') || lowerDesc.includes('shelf')) {
        finalCategory = 'Storage';
      } else {
        finalCategory = 'Tools';
      }
    } else {
      // Fallback to original logic when no room context
      if (lowerDesc.includes('refrigerator') || lowerDesc.includes('fridge')) {
        finalCategory = 'Appliances';
      } else if (lowerDesc.includes('mixer') || lowerDesc.includes('blender')) {
        finalCategory = 'Appliances';
      } else if (lowerDesc.includes('tv') || lowerDesc.includes('television')) {
        finalCategory = 'Electronics';
      } else if (lowerDesc.includes('phone') || lowerDesc.includes('smartphone')) {
        finalCategory = 'Electronics';
      } else if (lowerDesc.includes('laptop') || lowerDesc.includes('computer')) {
        finalCategory = 'Electronics';
      } else if (lowerDesc.includes('vacuum') || lowerDesc.includes('cleaner')) {
        finalCategory = 'Appliances';
      } else if (lowerDesc.includes('iron') || lowerDesc.includes('ironing')) {
        finalCategory = 'Appliances';
      } else if (lowerDesc.includes('sewing')) {
        finalCategory = 'Appliances';
      } else {
        finalCategory = 'General';
      }
    }
  }
  
  // Determine subcategory if not provided
  let finalSubcategory = subcategory;
  if (!finalSubcategory) {
    if (lowerDesc.includes('refrigerator')) finalSubcategory = 'Refrigerators';
    else if (lowerDesc.includes('mixer')) finalSubcategory = 'Kitchen Appliances';
    else if (lowerDesc.includes('tv')) finalSubcategory = 'Televisions';
    else if (lowerDesc.includes('phone')) finalSubcategory = 'Mobile Devices';
    else if (lowerDesc.includes('laptop')) finalSubcategory = 'Computers';
    else if (lowerDesc.includes('vacuum')) finalSubcategory = 'Cleaning';
    else if (lowerDesc.includes('iron')) finalSubcategory = 'Laundry';
    else if (lowerDesc.includes('sewing')) finalSubcategory = 'Sewing';
    else finalSubcategory = 'General';
  }
  
  return {
    title: itemDesc,
    brand: brand || null,
    model: model || null,
    category: finalCategory,
    subcategory: finalSubcategory,
    attributes: attributes,
    keywords: keywords,
    condition: condition.toLowerCase(),
    damage: false, // CSV doesn't typically have damage info
    confidence: 0.8 // High confidence for CSV data
  };
}

// Price floor configuration (drop results that are too cheap vs expected price)
function getPriceFloorPercent() {
  const raw = parseFloat(process.env.PRICE_FLOOR_PERCENT);
  if (!isNaN(raw) && raw > 0 && raw < 1) return raw;
  return 0.7; // default 70%
}

// DEPLOYMENT VERSION CHECK
const ROUTE_VERSION = '2025-08-11-23:00:00-TIMEOUT-AND-CSV-FIXES';
console.log(`🚀 ROUTES VERSION: ${ROUTE_VERSION}`);

// Import the enhanced InsuranceItemPricer from shared service
const { getInsuranceItemPricer } = require('../services/sharedServices');

// Get the shared instance
const insuranceItemPricer = getInsuranceItemPricer();

if (!insuranceItemPricer) {
  console.error('❌ Failed to get shared InsuranceItemPricer instance');
  console.log('🔄 Will use dynamic alternative search mode');
}

// Configure multer for file uploads with cleanup
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  }
});

// Helper function to create retailer-specific search URLs
function createSearchUrl(query, itemDescription = '', source = '') {
  const searchQuery = query || itemDescription || 'replacement item';
  
  const cleanQuery = searchQuery
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);
  
  const encodedQuery = encodeURIComponent(cleanQuery);
  
  console.log(`🔗 URL DEBUG - Query: "${searchQuery}", Source: "${source}", Clean Query: "${cleanQuery}"`);
  
  // If we have a specific retailer source, create a direct search URL to their site
  if (source) {
    const sourceLower = source.toLowerCase();
    
    if (sourceLower.includes('home depot') || sourceLower.includes('homedepot')) {
      console.log(`🔗 URL DEBUG - Matched Home Depot: ${source}`);
      return `https://www.homedepot.com/s/${encodedQuery}`;
    } else if (sourceLower.includes('lowes') || sourceLower.includes('lowes.com')) {
      console.log(`🔗 URL DEBUG - Matched Lowes: ${source}`);
      return `https://www.lowes.com/search?searchTerm=${encodedQuery}`;
    } else if (sourceLower.includes('walmart') || sourceLower.includes('walmart.com')) {
      console.log(`🔗 URL DEBUG - Matched Walmart: ${source}`);
      return `https://www.walmart.com/search?q=${encodedQuery}`;
    } else if (sourceLower.includes('target') || sourceLower.includes('target.com')) {
      console.log(`🔗 URL DEBUG - Matched Target: ${source}`);
      return `https://www.target.com/s?searchTerm=${encodedQuery}`;
    } else if (sourceLower.includes('amazon') || sourceLower.includes('amazon.com')) {
      console.log(`🔗 URL DEBUG - Matched Amazon: ${source}`);
      return `https://www.amazon.com/s?k=${encodedQuery}`;
    } else if (sourceLower.includes('best buy') || sourceLower.includes('bestbuy')) {
      console.log(`🔗 URL DEBUG - Matched Best Buy: ${source}`);
      return `https://www.bestbuy.com/site/searchpage.jsp?st=${encodedQuery}`;
    } else if (sourceLower.includes('wayfair') || sourceLower.includes('wayfair.com')) {
      console.log(`🔗 URL DEBUG - Matched Wayfair: ${source}`);
      return `https://www.wayfair.com/keyword.php?keyword=${encodedQuery}`;
    } else if (sourceLower.includes('staples') || sourceLower.includes('staples.com')) {
      console.log(`🔗 URL DEBUG - Matched Staples: ${source}`);
      return `https://www.staples.com/search?query=${encodedQuery}`;
    } else {
      console.log(`🔗 URL DEBUG - No retailer match for source: ${source}`);
    }
  } else {
    console.log(`🔗 URL DEBUG - No source provided`);
  }
  
  // Fallback to Google Shopping search
  console.log(`🔗 URL DEBUG - Using Google Shopping fallback`);
  return null;
}

// Helper function to format price for CSV output (NEVER returns N/A - always shows a price)
function formatPriceForCSV(price) {
  if (!price || price === null || price === undefined) {
    return '$0.10'; // Minimum price instead of N/A
  }
  
  // Convert to string and remove any existing dollar signs
  let priceStr = price.toString().replace(/\$/g, '');
  
  // Parse as number to validate
  const priceNum = parseFloat(priceStr);
  if (isNaN(priceNum) || priceNum <= 0) {
    return '$0.10'; // Minimum price instead of N/A
  }
  
  // Format with single dollar sign and 2 decimal places
  return `$${priceNum.toFixed(2)}`;
}

// Helper to determine untrusted by domain list and suspicious patterns
function isBlockedMarketplaceSource(source) {
  if (!source) return true; // Block unknown sources

  const sourceLower = source.toLowerCase();

  // Check against centralized UNTRUSTED_DOMAINS (by root domain token or full domain)
  for (const domain of UNTRUSTED_DOMAINS) {
    const label = domain.split('.')[0];
    if (sourceLower.includes(domain) || sourceLower.includes(label)) {
      console.log(`🚫 BLOCKED MARKETPLACE (domain policy): ${source} (matches: ${domain})`);
      return true;
    }
  }

  // Block suspicious patterns (seller/marketplace heuristics)
  const suspiciousPatterns = [
    /.*seller.*/i,           // Contains "seller"
    /.*marketplace.*/i,      // Contains "marketplace"
    /.*trade.*co.*/i,        // Contains "trade co"
    /.*import.*export.*/i,   // Contains "import export"
    /.*wholesale.*/i,        // Contains "wholesale"
    /.*dropship.*/i,         // Contains "dropship"
    /.*fulfillment.*/i,      // Contains "fulfillment"
    /.*fu[hk]kj.*/i,        // Contains suspicious seller codes
    /.*wynbing.*/i,          // Contains suspicious seller names
    /.*co\.ltd.*/i,          // Contains "co.ltd" (often fake companies)
    /.*trading.*/i,          // Contains "trading" (often wholesale)
    /.*supply.*/i,           // Contains "supply" (often wholesale)
    /.*distributor.*/i       // Contains "distributor" (often wholesale)
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(source)) {
      console.log(`🚫 BLOCKED SUSPICIOUS SOURCE IN CSV: ${source} (pattern: ${pattern})`);
      return true;
    }
  }
  
  return false; // Allow this source
}

// Clean freeform user queries: drop size/price chatter and standalone numbers
function cleanFreeformQuery(query) {
  if (!query || typeof query !== 'string') return query;
  const dropWords = new Set(['size', 'number', 'cost', 'price', 'usd', 'dollar', 'dollars']);
  return query
    .split(/\s+/)
    .filter(tok => {
      const t = tok.toLowerCase().replace(/[^a-z0-9.\-]/g, '');
      if (dropWords.has(t)) return false;
      // drop pure numbers and decimals (e.g., 8, 8.5, 100)
      if (/^\d+(?:\.\d+)?$/.test(t)) return false;
      // drop dollar-prefixed
      if (/^\$\d+/.test(tok)) return false;
      return tok.trim().length > 0;
    })
    .join(' ')
    .trim();
}

// Helper function to build optimized search query for AI Vision results
function buildAIVisionSearchQuery(aiVisionItem) {
  const brand = aiVisionItem.brandOrManufacturer || aiVisionItem.brand;
  const product = aiVisionItem.itemDescription;
  const description = aiVisionItem.description;
  
  let searchQuery = '';
  
  if (brand && brand !== 'No Brand' && brand.length > 2) {
    searchQuery += brand + ' ';
  }
  
  const productWords = product.toLowerCase().split(' ');
  const skipWords = ['stainless', 'steel', 'adjustable', 'portable', 'with', 'and', 'the', 'settings'];
  const coreWords = productWords.filter(word => 
    word.length > 2 && !skipWords.includes(word)
  ).slice(0, 2);
  
  searchQuery += coreWords.join(' ');
  
  const result = searchQuery.trim();
  console.log(`🤖 AI Vision query optimization: "${product}" → "${result}"`);
  return result;
}

// Enhanced column detection with more flexibility
function detectColumns(headers) {
  const columnMap = {};
  
  headers.forEach(header => {
    const normalizedHeader = header.trim().toLowerCase();
    
    if (normalizedHeader === 'description' || 
        normalizedHeader === 'desc' || 
        normalizedHeader.includes('description')) {
      columnMap.description = header;
    }
    
    if (normalizedHeader.includes('item') && normalizedHeader.includes('#')) {
      columnMap.itemNumber = header;
    }
    if (normalizedHeader.includes('item') && normalizedHeader.includes('description')) {
      columnMap.itemDescription = header;
    }
    if (normalizedHeader.includes('brand') || normalizedHeader.includes('manufacturer')) {
      columnMap.brand = header;
    }
    if (normalizedHeader.includes('cost') && normalizedHeader.includes('replace')) {
      columnMap.costToReplace = header;
    }
    if (normalizedHeader.includes('purchase') && normalizedHeader.includes('price')) {
      columnMap.purchasePrice = header;
    }
    if (normalizedHeader.includes('quantity') || normalizedHeader.includes('qty')) {
      columnMap.quantity = header;
    }
    if (normalizedHeader.includes('category') || normalizedHeader.includes('cat')) {
      columnMap.category = header;
    }
    if (normalizedHeader.includes('subcategory') || normalizedHeader.includes('sub')) {
      columnMap.subcategory = header;
    }
  });
  
  return columnMap;
}

// Helper function to get field value from multiple possible column names
function getField(row, possibleNames) {
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name];
    }
  }
  return null;
}

// Build high-performance search query from row data
function buildHighPerformanceQuery(row, columnMap) {
  const itemDesc = getField(row, [columnMap.itemDescription, 'Item Description', 'Description']);
  const brand = getField(row, [columnMap.brand, 'Brand', 'Manufacturer']);
  
  // Don't use Item # as model - it's just a row identifier
  // const model = getField(row, [columnMap.itemNumber, 'Item #', 'Model']);
  
  let query = '';
  
  if (brand && brand !== 'No Brand' && brand.length > 2) {
    query += brand + ' ';
  }
  
  // Only use actual product descriptions, not row numbers
  if (itemDesc && itemDesc.length > 3) {
    // Clean up the description to make it more searchable
    let cleanDesc = itemDesc
      .replace(/\b(in|with|for|the|a|an)\b/gi, '') // Remove common filler words
      // Remove promo/custom-print terms that bias toward non-retail promo vendors
      .replace(/\b(custom|logo|promotional|promotion|giveaway|trade\s*show|swag|imprint(?:ed)?|branded|personalized|printing|engraved?)\b/gi, '')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // For specific product types, enhance the search
    if (cleanDesc.toLowerCase().includes('refrigerator')) {
      // Keep capacity and type information for refrigerators
      cleanDesc = cleanDesc.replace(/(\d+(?:\.\d+)?)\s*(?:cu\.?\s*ft\.?|cuft|cu\s*ft)/gi, '$1 cu ft');
    } else if (cleanDesc.toLowerCase().includes('mailbox') || cleanDesc.toLowerCase().includes('letter box')) {
      // For mailboxes, be more specific
      cleanDesc = cleanDesc.replace(/\b(metal|aluminum|steel)\b/gi, '$1');
      cleanDesc = cleanDesc.replace(/\b(black|white|bronze|silver)\b/gi, '$1');
    }
    
    query += cleanDesc;
  }
  
  const result = query.trim();
  
  console.log(`🔧 CSV Query Builder: Built query "${result}" from row:`, {
    brand,
    itemDesc,
    cleanDesc: itemDesc ? itemDesc.replace(/\b(in|with|for|the|a|an)\b/gi, '').replace(/\s+/g, ' ').trim() : null,
    itemNumber: row[columnMap.itemNumber] || 'N/A'
  });
  
  return {
    query: result,
    strategy: 'high-performance',
    components: { brand, itemDesc }
  };
}

// DYNAMIC ALTERNATIVE SEARCH - No hardcoded fallbacks
async function findDynamicAlternatives(query, targetPrice, tolerance) {
  console.log(`🔍 DYNAMIC ALTERNATIVE SEARCH: Looking for alternatives to "${query}"`);
  
  try {
    // Step 1: AI Analysis - Parse the query to understand what we're looking for
    const queryAnalysis = await analyzeQuery(query);
    console.log(`🤖 AI Analysis:`, queryAnalysis);
    
    // Step 2: Market Search - Search for similar products
    const alternativeResults = await searchForAlternatives(queryAnalysis, targetPrice);
    console.log(`🔍 Market Search: Found ${alternativeResults.length} alternatives`);
    
    // Step 3: Smart Validation - Filter and rank alternatives
    const validatedAlternatives = validateAlternatives(alternativeResults, queryAnalysis, targetPrice);
    console.log(`✅ Smart Validation: ${validatedAlternatives.length} alternatives passed validation`);
    
    // Step 4: Result + Explanation - Return the best alternative with clear explanation
    if (validatedAlternatives.length > 0) {
      const bestAlternative = validatedAlternatives[0];
      return {
        found: true,
        price: bestAlternative.price,
        source: bestAlternative.source,
        url: bestAlternative.url,
        category: bestAlternative.category || 'HSW',
        subcategory: bestAlternative.subcategory || 'Alternative',
        description: bestAlternative.description,
        isEstimated: false,
        matchQuality: 'Good - Alternative Found',
        status: 'alternative_found',
        explanation: `Exact specification not available. Found similar alternative: ${bestAlternative.description} at $${bestAlternative.price}`,
        matchedAttributes: bestAlternative.matchedAttributes,
        alternatives: validatedAlternatives.slice(0, 3) // Show top 3 alternatives
      };
    } else {
      return {
        found: false,
        status: 'no_alternatives_found',
        explanation: `Exact specification not available and no suitable alternatives found in the market.`,
        searchQuery: query,
        targetPrice: targetPrice
      };
    }
    
  } catch (error) {
    console.error(`❌ Dynamic alternative search failed:`, error);
    return {
      found: false,
      status: 'search_failed',
      explanation: `Search failed: ${error.message}`,
      searchQuery: query
    };
  }
}

// AI Analysis Step: Parse query to understand product specifications
async function analyzeQuery(query) {
  const lowerQuery = query.toLowerCase();
  console.log(`🔍 Analyzing query: "${query}"`);
  console.log(`🔍 Lowercase query: "${lowerQuery}"`);
  
  // Extract brand, type, capacity, and other specifications
  const analysis = {
    originalQuery: query,
    brand: null,
    productType: null,
    capacity: null,
    type: null,
    finish: null,
    keywords: []
  };
  
  // Step 1: Try local patterns first (fast, reliable)
  const localAnalysis = await analyzeQueryLocal(query, lowerQuery, analysis);
  
  // Step 2: If local analysis fails or is incomplete, use OpenAI
  if (!localAnalysis.brand || !localAnalysis.productType) {
    console.log(`🤖 Local analysis incomplete, trying OpenAI...`);
    try {
      const aiAnalysis = await analyzeQueryWithAI(query, localAnalysis);
      if (aiAnalysis) {
        console.log(`✅ OpenAI analysis successful:`, aiAnalysis);
        return aiAnalysis;
      }
    } catch (error) {
      console.log(`⚠️ OpenAI analysis failed:`, error.message);
    }
  }
  
  // NEW: Step 3: AI Description Enhancement for better search results
  try {
    if (process.env.OPENAI_API_KEY) {
      console.log(`🤖 AI Description Enhancement: Enhancing query for better search`);
      const enhancedQuery = await enhanceDescriptionWithAI(query);
      if (enhancedQuery && enhancedQuery !== query) {
        console.log(`✅ Query enhanced: "${query}" → "${enhancedQuery}"`);
        localAnalysis.enhancedQuery = enhancedQuery;
        localAnalysis.searchTerms = [enhancedQuery, ...(localAnalysis.searchTerms || [])];
      }
    }
  } catch (error) {
    console.log(`⚠️ AI description enhancement failed:`, error.message);
  }
  
  console.log(`🔍 Final analysis:`, JSON.stringify(localAnalysis, null, 2));
  return localAnalysis;
}

// Local pattern-based analysis (fast, reliable for common products)
async function analyzeQueryLocal(query, lowerQuery, analysis) {
  
  // Extract brand (comprehensive list of common brands)
  const brands = [
    // Appliances
    'vissani', 'whirlpool', 'lg', 'samsung', 'ge', 'frigidaire', 'kitchenaid', 'bosch', 'miele', 'subzero', 'maytag', 'kenmore', 'electrolux', 'panasonic', 'sharp', 'toshiba', 'hitachi', 'daewoo', 'haier', 'hisense', 'amana', 'jennair', 'wolf', 'cove', 'thermador', 'gaggenau', 'fisher', 'paykel', 'smeg', 'beko', 'grundig', 'siemens', 'neff', 'bauknecht', 'liebherr', 'bissell',
    
    // Electronics
    'apple', 'iphone', 'macbook', 'ipad', 'mac', 'sony', 'panasonic', 'philips', 'jvc', 'pioneer', 'denon', 'onkyo', 'yamaha', 'harman', 'kardon', 'bose', 'klipsch', 'sennheiser', 'audio', 'technica', 'shure', 'akg', 'beats', 'jbl', 'logitech', 'razer', 'steelseries', 'corsair', 'asus', 'acer', 'dell', 'hp', 'lenovo', 'msi', 'gigabyte', 'evga', 'xfx', 'sapphire',
    
    // Tools & Hardware
    'dewalt', 'milwaukee', 'makita', 'bosch', 'ryobi', 'black', 'decker', 'craftsman', 'stanley', 'irwin', 'klein', 'knipex', 'wera', 'felo', 'stahlwille', 'snap-on', 'matco', 'cornwell', 'mac', 'tools', 'gearwrench', 'tekton', 'sunex', 'astro', 'pneumatic', 'ingersoll', 'rand', 'chicago', 'pneumatic', 'air', 'cat', 'nitrocat', 'airstar',
    
    // Automotive
    'snap-on', 'matco', 'cornwell', 'mac', 'tools', 'gearwrench', 'tekton', 'sunex', 'astro', 'pneumatic', 'ingersoll', 'rand', 'chicago', 'pneumatic', 'air', 'cat', 'nitrocat', 'airstar',
    
    // Sports & Outdoor
    'nike', 'adidas', 'reebok', 'puma', 'under', 'armour', 'new', 'balance', 'asics', 'brooks', 'saucony', 'hoka', 'salomon', 'merrell', 'keen', 'columbia', 'north', 'face', 'patagonia', 'arc', 'teryx', 'marmot', 'mountain', 'hardwear', 'osprey', 'gregory', 'deuter', 'kelty', 'coleman', 'msr', 'black', 'diamond', 'petzl', 'grivel', 'cassin', 'la', 'sportiva', 'scarpa', 'salewa', 'lowa', 'hanwag', 'meindl', 'zamberlan', 'crispi', 'asolo', 'ak', 'beretta', 'remington', 'winchester', 'browning', 'ruger', 'savage', 'mossberg', 'benelli', 'franchi', 'stoeger', 'weatherby', 'howa', 'tikka', 'sako', 'cz', 'springfield', 'armory', 'daniel', 'defense', 'bcm', 'aero', 'precision', 'psa', 'anderson', 'manufacturing', 'palmetto', 'state', 'armory'
  ];
  
  // Improved brand detection: use word boundaries to avoid false matches
  for (const brand of brands) {
    // Use word boundaries to avoid matching substrings like "on" in "Iron And Ironing Board"
    const brandRegex = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (brandRegex.test(query)) {
      analysis.brand = brand;
      console.log(`🔍 Found brand: ${brand}`);
      break;
    }
  }
  
  // Extract product type (comprehensive detection)
  if (lowerQuery.includes('refrigerator') || lowerQuery.includes('fridge') || lowerQuery.includes('freezer')) {
    analysis.productType = 'refrigerator';
    console.log(`🔍 Found product type: refrigerator`);
    if (lowerQuery.includes('bottom freezer')) analysis.type = 'bottom_freezer';
    else if (lowerQuery.includes('top freezer')) analysis.type = 'top_freezer';
    else if (lowerQuery.includes('french door')) analysis.type = 'french_door';
    else if (lowerQuery.includes('side by side')) analysis.type = 'side_by_side';
    else if (/\bmini\b/.test(lowerQuery) || lowerQuery.includes('compact')) analysis.type = 'mini';
    else if (lowerQuery.includes('counter depth')) analysis.type = 'counter_depth';
    else if (lowerQuery.includes('built in')) analysis.type = 'built_in';
    console.log(`🔍 Refrigerator type: ${analysis.type}`);
  } else if (lowerQuery.includes('mixer') || lowerQuery.includes('stand mixer') || lowerQuery.includes('hand mixer')) {
    analysis.productType = 'mixer';
    if (lowerQuery.includes('stand')) analysis.type = 'stand_mixer';
    else if (lowerQuery.includes('hand')) analysis.type = 'hand_mixer';
    else if (lowerQuery.includes('immersion')) analysis.type = 'immersion_mixer';
  } else if (lowerQuery.includes('tv') || lowerQuery.includes('television') || lowerQuery.includes('monitor')) {
    analysis.productType = 'tv';
    if (lowerQuery.includes('oled')) analysis.type = 'oled';
    else if (lowerQuery.includes('qled')) analysis.type = 'qled';
    else if (lowerQuery.includes('led')) analysis.type = 'led';
    else if (lowerQuery.includes('plasma')) analysis.type = 'plasma';
    else if (lowerQuery.includes('smart')) analysis.type = 'smart_tv';
  } else if (lowerQuery.includes('phone') || lowerQuery.includes('iphone') || lowerQuery.includes('smartphone') || lowerQuery.includes('mobile')) {
    analysis.productType = 'phone';
    if (lowerQuery.includes('pro')) analysis.type = 'pro';
    else if (lowerQuery.includes('plus')) analysis.type = 'plus';
    else if (/\bmini\b/.test(lowerQuery)) analysis.type = 'mini';
    else if (lowerQuery.includes('ultra')) analysis.type = 'ultra';
  } else if (lowerQuery.includes('laptop') || lowerQuery.includes('computer') || lowerQuery.includes('macbook') || lowerQuery.includes('notebook')) {
    analysis.productType = 'laptop';
    if (lowerQuery.includes('gaming')) analysis.type = 'gaming';
    else if (lowerQuery.includes('business')) analysis.type = 'business';
    else if (lowerQuery.includes('ultrabook')) analysis.type = 'ultrabook';
    else if (lowerQuery.includes('convertible')) analysis.type = 'convertible';
  } else if (lowerQuery.includes('washer') || lowerQuery.includes('washing machine') || lowerQuery.includes('dryer')) {
    analysis.productType = 'laundry';
    if (lowerQuery.includes('front load')) analysis.type = 'front_load';
    else if (lowerQuery.includes('top load')) analysis.type = 'top_load';
    else if (lowerQuery.includes('stackable')) analysis.type = 'stackable';
    else if (lowerQuery.includes('compact')) analysis.type = 'compact';
  } else if (lowerQuery.includes('dishwasher') || lowerQuery.includes('dish washer')) {
    analysis.productType = 'dishwasher';
    if (lowerQuery.includes('built in')) analysis.type = 'built_in';
    else if (lowerQuery.includes('portable')) analysis.type = 'portable';
    else if (lowerQuery.includes('drawer')) analysis.type = 'drawer';
  } else if (lowerQuery.includes('oven') || lowerQuery.includes('stove') || lowerQuery.includes('range')) {
    analysis.productType = 'cooking';
    if (lowerQuery.includes('gas')) analysis.type = 'gas';
    else if (lowerQuery.includes('electric')) analysis.type = 'electric';
    else if (lowerQuery.includes('induction')) analysis.type = 'induction';
    else if (lowerQuery.includes('convection')) analysis.type = 'convection';
    else if (lowerQuery.includes('double')) analysis.type = 'double_oven';
  } else if (lowerQuery.includes('microwave') || lowerQuery.includes('microwave oven')) {
    analysis.productType = 'microwave';
    if (lowerQuery.includes('over the range')) analysis.type = 'over_range';
    else if (lowerQuery.includes('built in')) analysis.type = 'built_in';
    else if (lowerQuery.includes('countertop')) analysis.type = 'countertop';
  } else if (lowerQuery.includes('vacuum') || lowerQuery.includes('vacuum cleaner') || lowerQuery.includes('hoover') || lowerQuery.includes('shampooer') || lowerQuery.includes('rug shampooer')) {
    analysis.productType = 'vacuum';
    if (lowerQuery.includes('upright')) analysis.type = 'upright';
    else if (lowerQuery.includes('canister')) analysis.type = 'canister';
    else if (lowerQuery.includes('stick')) analysis.type = 'stick';
    else if (lowerQuery.includes('robot')) analysis.type = 'robot';
    else if (lowerQuery.includes('bagless')) analysis.type = 'bagless';
    else if (lowerQuery.includes('shampooer') || lowerQuery.includes('rug shampooer')) analysis.type = 'rug_shampooer';
  } else if (lowerQuery.includes('iron') || lowerQuery.includes('ironing board')) {
    analysis.productType = 'ironing';
    if (lowerQuery.includes('steam')) analysis.type = 'steam_iron';
    else if (lowerQuery.includes('cordless')) analysis.type = 'cordless_iron';
    else if (lowerQuery.includes('travel')) analysis.type = 'travel_iron';
    else if (lowerQuery.includes('tabletop')) analysis.type = 'tabletop_board';
    else if (lowerQuery.includes('full size')) analysis.type = 'full_size_board';
    else if (lowerQuery.includes('wall mount')) analysis.type = 'wall_mount_board';
  } else if (lowerQuery.includes('sewing machine') || lowerQuery.includes('serger')) {
    analysis.productType = 'sewing';
    if (lowerQuery.includes('heavy duty')) analysis.type = 'heavy_duty';
    else if (lowerQuery.includes('computerized')) analysis.type = 'computerized';
    else if (lowerQuery.includes('mechanical')) analysis.type = 'mechanical';
    else if (lowerQuery.includes('embroidery')) analysis.type = 'embroidery';
    else if (lowerQuery.includes('quilting')) analysis.type = 'quilting';
  } else if (lowerQuery.includes('air conditioner') || lowerQuery.includes('ac') || lowerQuery.includes('air conditioning')) {
    analysis.productType = 'air_conditioner';
    if (lowerQuery.includes('window')) analysis.type = 'window';
    else if (lowerQuery.includes('portable')) analysis.type = 'portable';
    else if (lowerQuery.includes('split')) analysis.type = 'split';
    else if (lowerQuery.includes('central')) analysis.type = 'central';
  } else if (lowerQuery.includes('furnace') || lowerQuery.includes('heater') || lowerQuery.includes('boiler')) {
    analysis.productType = 'heating';
    if (lowerQuery.includes('gas')) analysis.type = 'gas';
    else if (lowerQuery.includes('electric')) analysis.type = 'electric';
    else if (lowerQuery.includes('oil')) analysis.type = 'oil';
    else if (lowerQuery.includes('heat pump')) analysis.type = 'heat_pump';
  } else if (lowerQuery.includes('tablet') || lowerQuery.includes('ipad')) {
    analysis.productType = 'tablet';
    if (lowerQuery.includes('pro')) analysis.type = 'pro';
    else if (lowerQuery.includes('air')) analysis.type = 'air';
    else if (/\bmini\b/.test(lowerQuery)) analysis.type = 'mini';
  } else if (lowerQuery.includes('headphones') || lowerQuery.includes('earbuds') || lowerQuery.includes('earphones')) {
    analysis.productType = 'audio';
    if (lowerQuery.includes('wireless')) analysis.type = 'wireless';
    else if (lowerQuery.includes('noise cancelling')) analysis.type = 'noise_cancelling';
    else if (lowerQuery.includes('bluetooth')) analysis.type = 'bluetooth';
  } else if (lowerQuery.includes('camera') || lowerQuery.includes('camcorder')) {
    analysis.productType = 'camera';
    if (lowerQuery.includes('dslr')) analysis.type = 'dslr';
    else if (lowerQuery.includes('mirrorless')) analysis.type = 'mirrorless';
    else if (lowerQuery.includes('point and shoot')) analysis.type = 'point_shoot';
    else if (lowerQuery.includes('action')) analysis.type = 'action';
  } else if (lowerQuery.includes('gaming') || lowerQuery.includes('console') || lowerQuery.includes('xbox') || lowerQuery.includes('playstation') || lowerQuery.includes('nintendo')) {
    analysis.productType = 'gaming';
    if (lowerQuery.includes('xbox')) analysis.type = 'xbox';
    else if (lowerQuery.includes('playstation') || lowerQuery.includes('ps')) analysis.type = 'playstation';
    else if (lowerQuery.includes('nintendo') || lowerQuery.includes('switch')) analysis.type = 'nintendo';
  } else if (lowerQuery.includes('waterpot') || lowerQuery.includes('watering can') || lowerQuery.includes('planter') || lowerQuery.includes('pot') || lowerQuery.includes('container')) {
    analysis.productType = 'garden_container';
    if (lowerQuery.includes('waterpot')) analysis.type = 'waterpot';
    else if (lowerQuery.includes('watering can')) analysis.type = 'watering_can';
    else if (lowerQuery.includes('planter')) analysis.type = 'planter';
    else if (lowerQuery.includes('pot')) analysis.type = 'pot';
    else if (lowerQuery.includes('container')) analysis.type = 'container';
  }
  
  // Extract capacity (for appliances)
  const capacityMatch = lowerQuery.match(/(\d+(?:\.\d+)?)\s*(?:cu\.?\s*ft\.?|cuft|cu\s*ft)/i);
  if (capacityMatch) {
    analysis.capacity = parseFloat(capacityMatch[1]);
    console.log(`🔍 Found capacity: ${analysis.capacity} cu ft`);
  } else {
    console.log(`❌ No capacity match found`);
  }
  
  // Extract capacity for mixers (quarts)
  const quartMatch = lowerQuery.match(/(\d+(?:\.\d+)?)\s*(?:quart|qt)/i);
  if (quartMatch) {
    analysis.capacity = parseFloat(quartMatch[1]);
    console.log(`🔍 Found capacity: ${analysis.capacity} quarts`);
  }
  
  // Extract capacity for washers (cubic feet)
  const washerMatch = lowerQuery.match(/(\d+(?:\.\d+)?)\s*(?:cu\.?\s*ft\.?|cuft|cu\s*ft)/i);
  if (washerMatch) {
    analysis.capacity = parseFloat(washerMatch[1]);
    console.log(`🔍 Found capacity: ${analysis.capacity} cu ft`);
  }
  
  // Extract finish
  if (lowerQuery.includes('stainless steel')) analysis.finish = 'stainless_steel';
  else if (lowerQuery.includes('black')) analysis.finish = 'black';
  else if (lowerQuery.includes('white')) analysis.finish = 'white';
  else if (lowerQuery.includes('silver')) analysis.finish = 'silver';
  else if (lowerQuery.includes('chrome')) analysis.finish = 'chrome';
  else if (lowerQuery.includes('brushed')) analysis.finish = 'brushed';
  else if (lowerQuery.includes('matte')) analysis.finish = 'matte';
  else if (lowerQuery.includes('glossy')) analysis.finish = 'glossy';
  
  // Extract size (for TVs, monitors, etc.)
  const sizeMatch = lowerQuery.match(/(\d+)\s*(?:inch|"|in)/i);
  if (sizeMatch) {
    analysis.size = parseInt(sizeMatch[1]);
  }
  
  // Extract weight (for tools, etc.)
  const weightMatch = lowerQuery.match(/(\d+(?:\.\d+)?)\s*(?:lb|pound|kg|gram)/i);
  if (weightMatch) {
    analysis.weight = parseFloat(weightMatch[1]);
  }
  
  // Extract power (for tools, appliances)
  const powerMatch = lowerQuery.match(/(\d+(?:\.\d+)?)\s*(?:watt|w|hp|horsepower|amp|a)/i);
  if (powerMatch) {
    analysis.power = parseFloat(powerMatch[1]);
  }
  
  console.log(`🔍 Final analysis:`, JSON.stringify(analysis, null, 2));
  return analysis;
}

// OpenAI-powered product analysis for complex or unknown products
async function analyzeQueryWithAI(query, existingAnalysis) {
  try {
    // Check if OpenAI is available
    if (!process.env.OPENAI_API_KEY) {
      console.log(`⚠️ OpenAI API key not available, skipping AI analysis`);
      return null;
    }
    
    console.log(`🤖 Using OpenAI to analyze: "${query}"`);
    
    // Create OpenAI client
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
         const prompt = `You are a price optimization expert for insurance claims. Your goal is to find the LOWEST possible prices from TRUSTED RETAILERS ONLY.

Product Query: "${query}"
Existing Analysis: ${JSON.stringify(existingAnalysis)}

CRITICAL REQUIREMENTS:
1. ONLY consider trusted retailers: Walmart, Target, Amazon, Best Buy, Home Depot, Lowe's, Macy's, Kohl's, Costco, Sam's Club
2. Find the LOWEST possible price for this product
3. Identify alternative products that are cheaper but equivalent quality
4. Suggest budget-friendly alternatives within 20% of target price
5. Prioritize verified pricing from trusted sources

TRUSTED SOURCES ONLY - NO marketplace sellers, eBay, or unverified sources.

Return ONLY a valid JSON response with this exact format:
{
  "brand": "extracted brand name",
  "productType": "main product category",
  "type": "specific product type",
  "capacity": "capacity if applicable",
  "size": "size if applicable",
  "searchTerms": ["lowest price", "best deal", "trusted retailer", "verified pricing"],
  "expectedPriceRange": {"min": 50, "max": 300},
  "lowestPriceStrategy": "specific search terms to find lowest prices from trusted sources",
  "trustedRetailers": ["Walmart", "Target", "Amazon"],
  "confidence": "high|medium|low",
  "reasoning": "explanation of how to get best deal from trusted sources only"
}`;

    const response = await openai.chat.completions.create({
      model: gpt5Config.getTextModel(),
      messages: [
        {
          role: 'system',
          content: 'You are a product analysis expert. Return only valid JSON, no other text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    });
    
    const aiResult = JSON.parse(response.choices[0].message.content);
    console.log(`🤖 OpenAI analysis result:`, aiResult);
    
    // Merge AI results with existing analysis
    const mergedAnalysis = {
      ...existingAnalysis,
      ...aiResult,
      originalQuery: query
    };
    
    return mergedAnalysis;
    
  } catch (error) {
    console.error(`❌ OpenAI analysis failed:`, error.message);
    return null;
  }
}

// Market Search Step: Search for alternative products
async function searchForAlternatives(queryAnalysis, targetPrice) {
  // This would integrate with SerpAPI to search for similar products
  // For now, we'll simulate the search results
  console.log(`🔍 Searching for alternatives to: ${queryAnalysis.originalQuery}`);
  console.log(`🔍 Query analysis:`, JSON.stringify(queryAnalysis, null, 2));
  
  // In a real implementation, this would make API calls to search for:
  // 1. Same brand, similar specifications
  // 2. Same type, different capacity/size
  // 3. Similar products from trusted retailers
  
  // Simulated results for demonstration - UNIVERSAL APPROACH
  const alternatives = [];
  
  // UNIVERSAL: Handle any refrigerator/freezer products
  if (queryAnalysis.productType === 'refrigerator') {
    console.log(`🔍 Processing refrigerator with brand: ${queryAnalysis.brand}, capacity: ${queryAnalysis.capacity}`);
    if (queryAnalysis.brand && queryAnalysis.capacity) {
      // For any brand and capacity, find similar models
      const baseCapacity = queryAnalysis.capacity;
      console.log(`🔍 Base capacity: ${baseCapacity}`);
      const similarCapacities = [
        baseCapacity - 0.5,
        baseCapacity - 0.3,
        baseCapacity + 0.3,
        baseCapacity + 0.5,
        baseCapacity + 1.0
      ].filter(cap => cap > 0);
      console.log(`🔍 Similar capacities: ${similarCapacities.join(', ')}`);
      
      similarCapacities.forEach(capacity => {
        const alternativeDescription = `${queryAnalysis.brand.charAt(0).toUpperCase() + queryAnalysis.brand.slice(1)} ${capacity.toFixed(1)} cu. ft. ${queryAnalysis.type ? queryAnalysis.type.replace('_', ' ') : 'Refrigerator'}`;
        const source = ['Home Depot', 'Lowes', 'Best Buy', 'Amazon', 'Walmart'][Math.floor(Math.random() * 5)];
        const alternative = {
          description: alternativeDescription,
          price: Math.round(400 + (capacity * 25) + (Math.random() * 200)),
          source: source,
          url: createSearchUrl(alternativeDescription, '', source),
          category: 'HSW',
          subcategory: 'Appliances',
          matchedAttributes: {
            brand: queryAnalysis.brand,
            type: queryAnalysis.type,
            capacity_cuft: capacity
          }
        };
        alternatives.push(alternative);
        console.log(`🔍 Added alternative: ${alternative.description} at $${alternative.price}`);
      });
    } else {
      console.log(`❌ Missing brand or capacity: brand=${queryAnalysis.brand}, capacity=${queryAnalysis.capacity}`);
    }
  } else {
    console.log(`❌ Not a refrigerator: productType=${queryAnalysis.productType}`);
  }
  
  // UNIVERSAL: Handle any mixer products
  if (queryAnalysis.productType === 'mixer') {
    if (queryAnalysis.brand && queryAnalysis.capacity) {
      const baseCapacity = queryAnalysis.capacity;
      const similarCapacities = [
        baseCapacity - 1,
        baseCapacity + 1,
        baseCapacity + 2
      ].filter(cap => cap > 0);
      
      similarCapacities.forEach(capacity => {
        const alternativeDescription = `${queryAnalysis.brand.charAt(0).toUpperCase() + queryAnalysis.brand.slice(1)} Professional ${capacity} Quart ${queryAnalysis.type ? queryAnalysis.type.replace('_', ' ') : 'Stand Mixer'}`;
        const source = ['Amazon', 'Target', 'Best Buy', 'Walmart'][Math.floor(Math.random() * 4)];
        alternatives.push({
          description: alternativeDescription,
          price: Math.round(300 + (capacity * 50) + (Math.random() * 100)),
          source: source,
          url: createSearchUrl(alternativeDescription, '', source),
          category: 'HSW',
          subcategory: 'Appliances',
          matchedAttributes: {
            brand: queryAnalysis.brand,
            type: queryAnalysis.type,
            capacity_qt: capacity
          }
        });
      });
    }
  }
  
  // UNIVERSAL: Handle any TV products
  if (queryAnalysis.productType === 'tv') {
    if (queryAnalysis.brand && queryAnalysis.size) {
      const targetSize = queryAnalysis.size;
      const similarSizes = [
        targetSize - 5,
        targetSize + 5,
        targetSize + 10
      ].filter(size => size > 0);
      
      similarSizes.forEach(size => {
        const alternativeDescription = `${queryAnalysis.brand.charAt(0).toUpperCase() + queryAnalysis.brand.slice(1)} ${size}" Class 4K UHD Smart TV`;
        const source = ['Best Buy', 'Amazon', 'Walmart', 'Target'][Math.floor(Math.random() * 4)];
        alternatives.push({
          description: alternativeDescription,
          price: Math.round(300 + (size * 15) + (Math.random() * 200)),
          source: source,
          url: createSearchUrl(alternativeDescription, '', source),
          category: 'HSW',
          subcategory: 'Electronics',
          matchedAttributes: {
            brand: queryAnalysis.brand,
            type: 'tv',
            size_inch: size
          }
        });
      });
    }
  }
  
  // UNIVERSAL: Handle any phone products
  if (queryAnalysis.productType === 'phone') {
    if (queryAnalysis.brand) {
      const phoneModels = [
        'Standard Model',
        'Pro Model',
        'Plus Model',
        'Mini Model'
      ];
      
      phoneModels.forEach((model, index) => {
        const alternativeDescription = `${queryAnalysis.brand.charAt(0).toUpperCase() + queryAnalysis.brand.slice(1)} ${model} 128GB`;
        const source = ['Apple Store', 'Amazon', 'Best Buy', 'Walmart'][Math.floor(Math.random() * 4)];
        alternatives.push({
          description: alternativeDescription,
          price: Math.round(600 + (index * 200) + (Math.random() * 100)),
          source: source,
          url: createSearchUrl(alternativeDescription, '', source),
          category: 'HSW',
          subcategory: 'Electronics',
          matchedAttributes: {
            brand: queryAnalysis.brand,
            type: 'phone',
            model: model.toLowerCase().replace(' ', '_')
          }
        });
      });
    }
  }
  
  // UNIVERSAL: Handle any laptop/computer products
  if (queryAnalysis.productType === 'laptop') {
    if (queryAnalysis.brand) {
      const laptopTypes = [
        'Air 13-inch',
        'Pro 13-inch',
        'Air 15-inch',
        'Pro 15-inch'
      ];
      
      laptopTypes.forEach((type, index) => {
        const alternativeDescription = `${queryAnalysis.brand.charAt(0).toUpperCase() + queryAnalysis.brand.slice(1)} MacBook ${type} M2 Chip 256GB`;
        const source = ['Apple Store', 'Amazon', 'Best Buy', 'Walmart'][Math.floor(Math.random() * 4)];
        alternatives.push({
          description: alternativeDescription,
          price: Math.round(1000 + (index * 200) + (Math.random() * 150)),
          source: source,
          url: createSearchUrl(alternativeDescription, '', source),
          category: 'HSW',
          subcategory: 'Electronics',
          matchedAttributes: {
            brand: queryAnalysis.brand,
            type: 'laptop',
            model: type.toLowerCase().replace(' ', '_')
          }
        });
      });
    }
  }
  
  // UNIVERSAL: Handle ironing products
  if (queryAnalysis.productType === 'ironing') {
    console.log(`🔍 Processing ironing product with type: ${queryAnalysis.type}`);
    
    // Common ironing board types and their typical price ranges
    const ironingTypes = [
      { type: 'tabletop_board', description: 'Tabletop Ironing Board', basePrice: 25, range: 20 },
      { type: 'full_size_board', description: 'Full Size Ironing Board', basePrice: 45, range: 30 },
      { type: 'wall_mount_board', description: 'Wall Mount Ironing Board', basePrice: 60, range: 40 },
      { type: 'steam_iron', description: 'Steam Iron', basePrice: 35, range: 25 },
      { type: 'cordless_iron', description: 'Cordless Iron', basePrice: 50, range: 35 },
      { type: 'travel_iron', description: 'Travel Iron', basePrice: 20, range: 15 }
    ];
    
         ironingTypes.forEach(ironType => {
       const alternativeDescription = `${ironType.description} with Iron Rest`;
       const source = ['Walmart', 'Target', 'Amazon', 'Best Buy', 'Home Depot'][Math.floor(Math.random() * 5)];
       alternatives.push({
         description: alternativeDescription,
         price: Math.round(ironType.basePrice + (Math.random() * ironType.range)),
         source: source,
         url: createSearchUrl(alternativeDescription, '', source),
         category: 'HSW',
         subcategory: 'Ironing',
         matchedAttributes: {
           product_type: 'ironing',
           type: ironType.type
         }
       });
     });
    
    console.log(`🔍 Added ${alternatives.length} ironing alternatives`);
  }
  
  // UNIVERSAL: Handle sewing products
  if (queryAnalysis.productType === 'sewing') {
    console.log(`🔍 Processing sewing product with type: ${queryAnalysis.type}`);
    
    const sewingTypes = [
      { type: 'heavy_duty', description: 'Heavy Duty Sewing Machine', basePrice: 150, range: 100 },
      { type: 'computerized', description: 'Computerized Sewing Machine', basePrice: 300, range: 200 },
      { type: 'mechanical', description: 'Mechanical Sewing Machine', basePrice: 100, range: 80 },
      { type: 'embroidery', description: 'Embroidery Machine', basePrice: 400, range: 300 },
      { type: 'quilting', description: 'Quilting Machine', basePrice: 250, range: 150 }
    ];
    
         sewingTypes.forEach(sewType => {
       const alternativeDescription = `${sewType.description}`;
       const source = ['Amazon', 'Walmart', 'Joann', 'Michaels'][Math.floor(Math.random() * 4)];
       alternatives.push({
         description: alternativeDescription,
         price: Math.round(sewType.basePrice + (Math.random() * sewType.range)),
         source: source,
         url: createSearchUrl(alternativeDescription, '', source),
         category: 'HSW',
         subcategory: 'Sewing',
         matchedAttributes: {
           product_type: 'sewing',
           type: sewType.type
         }
       });
     });
    
    console.log(`🔍 Added ${alternatives.length} sewing alternatives`);
  }
  
  // UNIVERSAL: Handle vacuum/cleaning products
  if (queryAnalysis.productType === 'vacuum') {
    console.log(`🔍 Processing vacuum/cleaning product with type: ${queryAnalysis.type}`);
    
    const vacuumTypes = [
      { type: 'upright', description: 'Upright Vacuum Cleaner', basePrice: 120, range: 80 },
      { type: 'canister', description: 'Canister Vacuum Cleaner', basePrice: 150, range: 100 },
      { type: 'stick', description: 'Stick Vacuum Cleaner', basePrice: 80, range: 60 },
      { type: 'robot', description: 'Robot Vacuum Cleaner', basePrice: 200, range: 150 },
      { type: 'bagless', description: 'Bagless Vacuum Cleaner', basePrice: 100, range: 70 },
      { type: 'rug_shampooer', description: 'Rug Shampooer', basePrice: 110, range: 80 }
    ];
    
    vacuumTypes.forEach(vacType => {
      const alternativeDescription = `${queryAnalysis.brand ? queryAnalysis.brand.charAt(0).toUpperCase() + queryAnalysis.brand.slice(1) + ' ' : ''}${vacType.description}`;
      const source = ['Walmart', 'Target', 'Amazon', 'Best Buy', 'Home Depot'][Math.floor(Math.random() * 5)];
      alternatives.push({
        description: alternativeDescription,
        price: Math.round(vacType.basePrice + (Math.random() * vacType.range)),
        source: source,
        url: createSearchUrl(alternativeDescription, '', source),
        category: 'HSW',
        subcategory: 'Cleaning',
        matchedAttributes: {
          product_type: 'vacuum',
          type: vacType.type
        }
      });
    });
    
    console.log(`🔍 Added ${alternatives.length} vacuum/cleaning alternatives`);
  }
  
  // UNIVERSAL: Handle any other product types not specifically covered above
  if (!alternatives.length && queryAnalysis.brand) {
    // Generic fallback for any product with a brand
    const similarModelDescription = `${queryAnalysis.brand.charAt(0).toUpperCase() + queryAnalysis.brand.slice(1)} ${queryAnalysis.productType ? queryAnalysis.productType.charAt(0).toUpperCase() + queryAnalysis.productType.slice(1) : 'Product'} - Similar Model`;
    const source1 = ['Amazon', 'Walmart', 'Target', 'Best Buy'][Math.floor(Math.random() * 4)];
    alternatives.push({
      description: similarModelDescription,
      price: Math.round(200 + (Math.random() * 800)),
      source: source1,
      url: createSearchUrl(similarModelDescription, '', source1),
      category: 'HSW',
      subcategory: queryAnalysis.productType ? queryAnalysis.productType.charAt(0).toUpperCase() + queryAnalysis.productType.slice(1) : 'General',
      matchedAttributes: {
        brand: queryAnalysis.brand,
        type: queryAnalysis.type || 'generic',
        product_type: queryAnalysis.productType
      }
    });
    
    const alternativeModelDescription = `${queryAnalysis.brand.charAt(0).toUpperCase() + queryAnalysis.brand.slice(1)} ${queryAnalysis.productType ? queryAnalysis.productType.charAt(0).toUpperCase() + queryAnalysis.productType.slice(1) : 'Product'} - Alternative Model`;
    const source2 = ['Walmart', 'Target', 'Amazon', 'Best Buy'][Math.floor(Math.random() * 4)];
    alternatives.push({
      description: alternativeModelDescription,
      price: Math.round(300 + (Math.random() * 700)),
      source: source2,
      url: createSearchUrl(alternativeModelDescription, '', source2),
      category: 'HSW',
      subcategory: queryAnalysis.productType ? queryAnalysis.productType.charAt(0).toUpperCase() + queryAnalysis.productType.slice(1) : 'General',
      matchedAttributes: {
        brand: queryAnalysis.type || 'alternative',
        type: queryAnalysis.type || 'alternative',
        product_type: queryAnalysis.productType
      }
    });
  }
  
  // UNIVERSAL: Handle products without brands but with product types
  if (!alternatives.length && queryAnalysis.productType && !queryAnalysis.brand) {
    console.log(`🔍 Processing ${queryAnalysis.productType} product without brand`);
    
    if (queryAnalysis.productType === 'ironing') {
      // Generic ironing products
      const genericIroning = [
        'Standard Ironing Board',
        'Tabletop Ironing Board',
        'Steam Iron',
        'Ironing Board with Cover'
      ];
      
      genericIroning.forEach((desc, index) => {
        const source = ['Walmart', 'Target', 'Amazon'][Math.floor(Math.random() * 3)];
        alternatives.push({
          description: desc,
          price: Math.round(30 + (index * 15) + (Math.random() * 20)),
          source: source,
          url: createSearchUrl(desc, '', source),
          category: 'HSW',
          subcategory: 'Ironing',
          matchedAttributes: {
            product_type: 'ironing',
            type: 'generic'
          }
        });
      });
    }
  }
  
  // UNIVERSAL: Handle products analyzed by OpenAI (AI-first approach)
  if (!alternatives.length && queryAnalysis.searchTerms && queryAnalysis.searchTerms.length > 0) {
    console.log(`🤖 Using OpenAI-generated search terms for lowest price optimization:`, queryAnalysis.searchTerms);
    
    // Use AI-generated search terms to find lowest prices from trusted sources
    if (queryAnalysis.trustedRetailers && queryAnalysis.trustedRetailers.length > 0) {
      console.log(`🎯 Targeting trusted retailers:`, queryAnalysis.trustedRetailers);
      
      // Create search strategies for each trusted retailer
      queryAnalysis.trustedRetailers.forEach((retailer, index) => {
        // Use AI-generated search terms to find lowest prices
        queryAnalysis.searchTerms.forEach((searchTerm, termIndex) => {
          const basePrice = queryAnalysis.expectedPriceRange?.min || 100;
          const priceRange = (queryAnalysis.expectedPriceRange?.max || 200) - basePrice;
          
          // Focus on finding the lowest price from this trusted retailer
          const optimizedPrice = Math.round(basePrice + (termIndex * 10)); // Smaller increments for better price optimization
          
          alternatives.push({
            description: `${queryAnalysis.brand ? queryAnalysis.brand + ' ' : ''}${searchTerm}`,
            price: optimizedPrice,
            source: retailer,
            url: createSearchUrl(searchTerm, '', retailer),
            category: 'HSW',
            subcategory: queryAnalysis.productType || 'General',
            matchedAttributes: {
              brand: queryAnalysis.brand,
              product_type: queryAnalysis.productType,
              type: queryAnalysis.type,
              ai_generated: true,
              confidence: queryAnalysis.confidence,
              trusted_source: true,
              lowest_price_strategy: queryAnalysis.lowestPriceStrategy || 'AI-optimized search'
            }
          });
        });
      });
      
      console.log(`🤖 Added ${alternatives.length} AI-optimized alternatives from trusted sources`);
    } else {
      // Fallback to general search terms
      queryAnalysis.searchTerms.forEach((searchTerm, index) => {
        const source = ['Walmart', 'Target', 'Amazon', 'Best Buy', 'Home Depot'][Math.floor(Math.random() * 5)];
        const basePrice = queryAnalysis.expectedPriceRange?.min || 100;
        const priceRange = (queryAnalysis.expectedPriceRange?.max || 200) - basePrice;
        
        alternatives.push({
          description: `${queryAnalysis.brand ? queryAnalysis.brand + ' ' : ''}${searchTerm}`,
          price: Math.round(basePrice + (index * 20) + (Math.random() * priceRange)),
          source: source,
          url: createSearchUrl(searchTerm, '', source),
          category: 'HSW',
          subcategory: queryAnalysis.productType || 'General',
          matchedAttributes: {
            brand: queryAnalysis.brand,
            product_type: queryAnalysis.productType,
            type: queryAnalysis.type,
            ai_generated: true,
            confidence: queryAnalysis.confidence
          }
        });
      });
      
      console.log(`🤖 Added ${alternatives.length} AI-generated alternatives (fallback)`);
    }
  }
  
  return alternatives;
}

// Smart Validation Step: Filter and rank alternatives (block-only approach)
function validateAlternatives(alternatives, queryAnalysis, targetPrice) {
  if (alternatives.length === 0) return [];
  
  // Filter alternatives based on similarity and quality
  const validated = alternatives.filter(alt => {
    // BLOCK: Only reject known problematic sources
    const blockedSources = [
      'ebay', 'etsy', 'facebook', 'craigslist', 'offerup', 'mercari',
      'wish', 'dhgate', 'temu', 'aliexpress', 'alibaba', 'fruugo',
      'bigbigmart', 'martexplore', 'directsupply', 'orbixis'
    ];
    
    const isBlocked = blockedSources.some(source => 
      alt.source.toLowerCase().includes(source)
    );
    
    if (isBlocked) {
      console.log(`🚫 BLOCKED: ${alt.source} is in blocked sources list`);
      return false;
    }
    
    // Allow everything else
    console.log(`✅ ALLOWED: ${alt.source}`);
    
    // Additional validation for AI-generated results
    if (alt.matchedAttributes?.ai_generated && alt.matchedAttributes?.trusted_source) {
      console.log(`✅ AI-OPTIMIZED: ${alt.source} - ${alt.description} at $${alt.price}`);
    }
    
    // Must have reasonable price (not too far from target)
    if (targetPrice && alt.price) {
      const priceDiff = Math.abs(alt.price - targetPrice);
      const maxDiff = targetPrice * 0.5; // Allow 50% difference
      if (priceDiff > maxDiff) {
        console.log(`🚫 PRICE OUTLIER: $${alt.price} is too far from target $${targetPrice}`);
        return false;
      }
    }
    
    return true;
  });
  
  // Rank alternatives by similarity and price
  validated.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    
    // AI-OPTIMIZED LOWEST PRICE BONUS (highest priority)
    if (a.matchedAttributes?.ai_generated && a.matchedAttributes?.trusted_source) {
      scoreA += 200; // Massive bonus for AI-optimized trusted results
      console.log(`🎯 AI-BONUS: ${a.description} gets +200 for AI optimization`);
    }
    if (b.matchedAttributes?.ai_generated && b.matchedAttributes?.trusted_source) {
      scoreB += 200;
      console.log(`🎯 AI-BONUS: ${b.description} gets +200 for AI optimization`);
    }
    
    // Brand match bonus
    if (a.matchedAttributes.brand === queryAnalysis.brand) scoreA += 100;
    if (b.matchedAttributes.brand === queryAnalysis.brand) scoreB += 100;
    
    // Type match bonus
    if (a.matchedAttributes.type === queryAnalysis.type) scoreA += 50;
    if (b.matchedAttributes.type === queryAnalysis.type) scoreB += 50;
    
    // Capacity similarity bonus (closer is better)
    if (queryAnalysis.capacity && a.matchedAttributes.capacity_cuft) {
      const diffA = Math.abs(a.matchedAttributes.capacity_cuft - queryAnalysis.capacity);
      scoreA += Math.max(0, 100 - diffA * 20);
    }
    if (queryAnalysis.capacity && b.matchedAttributes.capacity_cuft) {
      const diffB = Math.abs(b.matchedAttributes.capacity_cuft - queryAnalysis.capacity);
      scoreB += Math.max(0, 100 - diffB * 20);
    }
    
    // PRICE OPTIMIZATION BONUS (lower price gets higher score)
    if (targetPrice && a.price && b.price) {
      // Lower price gets higher score (we want the best deal)
      const priceScoreA = Math.max(0, 150 - a.price);
      const priceScoreB = Math.max(0, 150 - b.price);
      scoreA += priceScoreA;
      scoreB += priceScoreB;
      
      console.log(`💰 PRICE SCORE: ${a.description} $${a.price} gets +${priceScoreA}, ${b.description} $${b.price} gets +${priceScoreB}`);
    }
    
    // Final ranking
    const finalScore = scoreB - scoreA;
    console.log(`🏆 FINAL SCORE: ${a.description} vs ${b.description} = ${finalScore}`);
    
    return finalScore;
  });
  
  console.log(`✅ Validated ${validated.length} alternatives after filtering`);
  return validated;
}

// ========================================
// SINGLE ITEM PROCESSING ROUTE
// ========================================

// Process single item for pricing
router.post('/api/process-item', async (req, res) => {
  console.log('🔍 Single item processing route called');
  console.log('🔍 Request body:', req.body);
  
  try {
    const { description, costToReplace, priceTolerance = 50 } = req.body;
    
    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Description is required'
      });
    }
    
    console.log(`🔍 Processing single item: "${description}"`);
    console.log(`🔍 Cost to replace: ${costToReplace}`);
    console.log(`🔍 Price tolerance: ${priceTolerance}%`);
    
    // Convert single item to facts format for processing
    const facts = {
      title: description,
      brand: null,
      model: null,
      category: 'HSW',
      subcategory: 'General',
      attributes: [],
      keywords: description.toLowerCase().split(' ').filter(word => word.length > 2),
      condition: 'good',
      damage: false,
      confidence: 0.8
    };
    
    console.log('🔍 Converted to facts format:', facts);
    
    // Use the always show price pipeline
    const result = await alwaysShowPricePipeline(facts, costToReplace);
    
    console.log('🔍 Pipeline result:', result);
    console.log('🔍 Pipeline result URL:', result.url);
    console.log('🔍 Pipeline result URL type:', typeof result.url);
    
    // Format response for single item display
    const response = {
      success: true,
      item: {
        Price: result.adjustedPrice || result.basePrice,
        Source: result.source,
        URL: result.url,
        Status: result.status === 'FOUND' ? 'Found' : 'Estimated',
        'Match Quality': result.notes || 'AI-Enhanced Search',
        'Total Replacement Price': result.adjustedPrice || result.basePrice,
        'Search Query Used': description,
        pricingTier: result.pricingTier,
        confidence: result.confidence
      }
    };
    
    console.log('🔍 Final response:', response);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Single item processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process item',
      details: error.message
    });
  }
});

// Export the router
module.exports = router;