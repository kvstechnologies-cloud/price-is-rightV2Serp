// server/config/trustedSites.js
// List of UNTRUSTED retail sites for product pricing
// Any retailer NOT in this list is considered TRUSTED

const UNTRUSTED_SITES = [
  // Known untrusted sources as specified by user
  'alibaba.com',
  'ebay.com',
  'ebay',  // Add eBay without .com
  'ebay.co.uk',
  'ebay.ca',
  
  // Marketplace sites (unreliable pricing/quality)
  'aliexpress.com',
  'wish.com',
  'temu.com',
  'dhgate.com',
  'banggood.com',
  'gearbest.com',
  'lightinthebox.com',
  'miniinthebox.com',
  'tomtop.com',
  'geekbuying.com',
  'cafago.com',
  'tinydeal.com',
  'focalprice.com',
  'dealextreme.com',
  'dx.com',
  
  // Social commerce/peer-to-peer marketplaces
  'etsy.com',
  'etsy',  // Add Etsy without .com
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'poshmark.com',
  'whatnot.com',
  'whatnot',  // Add whatnot without .com
  'mercari.com',
  'depop.com',
  'vinted.com',
  'thredup.com',
  'vestiairecollective.com',
  'rebag.com',
  'therealreal.com',
  'fashionphile.com',
  
  // Auction and bidding sites
  'liveauctioneers.com',
  'invaluable.com',
  'bonhams.com',
  'christies.com',
  'sothebys.com',
  'heritage-auctions.com',
  'proxibid.com',
  'estatesales.net',
  'auctionzip.com',
  
  // Classified ads and local marketplaces
  'craigslist.org',
  'offerup.com',
  'letgo.com',
  'facebook.com/marketplace',
  'nextdoor.com',
  'varagesale.com',
  '5miles.com',
  'oodle.com',
  'recycler.com',
  'pennysaverusa.com',
  
  // Wholesale/bulk marketplaces
  'wholesale-central.com',
  'globalsources.com',
  'made-in-china.com',
  'ec21.com',
  'tradekey.com',
  'exportersindia.com',
  'indiamart.com',
  'tradeindia.com',
  
  // Dropshipping/white label sites
  'oberlo.com',
  'spocket.com',
  'modalyst.com',
  'printful.com',
  'printify.com',
  'gooten.com',
  'dropified.com',
  
  // Price comparison/aggregator sites (not direct sellers)
  'shopping.google.com',
  'shopzilla.com',
  'shopping.com',
  'nextag.com',
  'pricewatch.com',
  'pricegrabber.com',
  'bizrate.com',
  'shopbot.com',
  'kelkoo.com',
  'froogle.com',
  
  // Coupon/deal sites (not direct sellers)
  'groupon.com',
  'livingsocial.com',
  'woot.com',
  'slickdeals.net',
  'dealnews.com',
  'retailmenot.com',
  'coupons.com',
  'honey.com',
  
  // Questionable quality/reliability sites
  'shein.com',
  'romwe.com',
  'zaful.com',
  'rosegal.com',
  'sammydress.com',
  'tidebuy.com',
  'newchic.com',
  'rotita.com',
  'choies.com',
  'persunmall.com',
  
  // Generic/suspicious domains
  'cheapest.com',
  'bargain.com',
  'wholesale.com',
  'factory.com',
  'direct.com',
  'liquidation.com',
  'overstock-outlet.com',
  'surplus.com',
  'closeout.com'
];

// Helper function to check if a domain is trusted
// USER RULE: Any retailer not listed in the Untrusted list is considered trusted
function isTrustedSite(domain) {
  if (!domain) return false;
  
  // Normalize domain (remove protocol, www, etc.)
  const normalizedDomain = domain.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]; // Remove path
  
  // If it's in the untrusted list, it's NOT trusted
  const isUntrusted = UNTRUSTED_SITES.some(untrustedSite => 
    normalizedDomain.includes(untrustedSite) || untrustedSite.includes(normalizedDomain)
  );
  
  // Return true (trusted) if NOT in untrusted list
  return !isUntrusted;
}

// Helper function to get trusted domains for SerpAPI site filtering
// Since most sites are trusted, we'll exclude untrusted ones instead
function getTrustedDomainsForSerp() {
  // Return empty string since we trust most sites by default
  // The filtering will be done by excluding untrusted sites
  return '';
}

module.exports = {
  UNTRUSTED_SITES,
  isTrustedSite,
  getTrustedDomainsForSerp
};
