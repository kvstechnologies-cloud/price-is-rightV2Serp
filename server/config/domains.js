// Centralized trusted/untrusted domain configuration
// - Normalized to lowercase hostnames without scheme or www
// - Duplicates removed
// - If a domain appears in both lists, it is kept only in UNTRUSTED_DOMAINS
// - Lists kept alphabetically sorted

const { TRUSTED_SITES, isTrustedSite, getTrustedDomainsForSerp } = require('./trustedSites');

// Legacy trusted domains (keeping for backward compatibility)
const TRUSTED_DOMAINS = [
  'amazon.com',
  'walmart.com',
  'target.com',
  'homedepot.com',
  'lowes.com',
  'bestbuy.com',
  'wayfair.com',
  'ikea.com'
];

// Untrusted domains (sites we want to avoid)
const UNTRUSTED_DOMAINS = [
  'ebay.com',
  'alibaba.com',
  'aliexpress.com',
  'wish.com',
  'temu.com',
  'facebook.com',
  'instagram.com',
  'pinterest.com',
  'etsy.com',
  'mercari.com',
  'whatnot.com',
  'offerup.com',
  'letgo.com',
  'craigslist.org',
  'facebookmarketplace.com'
];

// Helper function to check if a domain is trusted (using new comprehensive list)
function isDomainTrusted(domain) {
  return isTrustedSite(domain);
}

// Helper function to check if a domain is untrusted
function isDomainUntrusted(domain) {
  if (!domain) return false;
  
  const normalizedDomain = domain.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
  
  return UNTRUSTED_DOMAINS.includes(normalizedDomain);
}

// Helper function to get trusted domains for SerpAPI queries
function getTrustedDomainsForSerpAPI() {
  return getTrustedDomainsForSerp();
}

module.exports = {
  TRUSTED_DOMAINS,
  UNTRUSTED_DOMAINS,
  TRUSTED_SITES, // Export the new comprehensive list
  isDomainTrusted,
  isDomainUntrusted,
  getTrustedDomainsForSerpAPI,
  isTrustedSite, // Export the new helper function
  getTrustedDomainsForSerp // Export the new helper function
};


