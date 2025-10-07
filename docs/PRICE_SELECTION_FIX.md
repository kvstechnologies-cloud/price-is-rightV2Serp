# Price Selection Fix - Prioritizing Lowest Prices from Direct URLs

## Issue Identified

The system was showing a replacement price of $35 from a catalog URL when a better direct product was available for $16.99, even though the purchase price was only $25. This happened because the price selection algorithm was prioritizing proximity to the original purchase price rather than finding the lowest available price.

## Root Cause Analysis

### Previous Logic (INCORRECT):
1. **Line 2448**: When target price exists, sort by proximity to target price: `Math.abs(a.price - targetPrice) - Math.abs(b.price - targetPrice)`
2. **Line 2502**: Only within tolerance band, sort by lowest price
3. **Result**: $35 was selected because it was closer to $25 than $16.99

### Insurance Replacement Logic (CORRECT):
- For insurance replacement, we want the **lowest cost to replace the item**
- Direct product URLs should be prioritized over catalog/search URLs
- Trusted retailers should be prioritized over untrusted sources

## Fixes Implemented

### 1. Updated Sorting Algorithm (`server/models/InsuranceItemPricer.js` lines 2445-2459)

```javascript
// BEFORE (WRONG):
if (hasTarget) {
  candidates.sort((a, b) => Math.abs(a.price - targetPrice) - Math.abs(b.price - targetPrice));
} else {
  candidates.sort((a, b) => a.price - b.price);
}

// AFTER (CORRECT):
candidates.sort((a, b) => {
  // First priority: Direct product URLs over catalog URLs
  const aIsDirect = this.isDirectRetailerProductUrl(a.link || a.url || '');
  const bIsDirect = this.isDirectRetailerProductUrl(b.link || b.url || '');
  
  if (aIsDirect && !bIsDirect) return -1; // a wins (direct URL)
  if (!aIsDirect && bIsDirect) return 1;  // b wins (direct URL)
  
  // Second priority: Lowest price
  return a.price - b.price;
});
```

### 2. Simplified Selection Pool (lines 2508-2513)

```javascript
// BEFORE: Complex tolerance band filtering
let selectionPool = hasInRange ? inBandCandidates : candidates.filter(c => hasTarget ? (c.price > maxPriceBand && c.price <= stretchMaxPrice) : true);

// AFTER: Use all candidates (already optimally sorted)
let selectionPool = candidates; // Use all candidates, already sorted by direct URL + lowest price
```

### 3. Updated Status Determination (lines 2574-2588)

```javascript
// BEFORE: Complex tolerance-based status
if (hasInRange && isWithinTolerance) {
  status = 'verified';
} else if (usedStretchBand && isWithinStretch) {
  status = 'price_estimated';
}

// AFTER: Direct URL and trusted source priority
const hasDirectUrl = this.isDirectRetailerProductUrl(bestMatch.link || bestMatch.url || '');
const isTrustedSource = this.isTrustedSource(bestMatch.source);

if (hasDirectUrl && isTrustedSource) {
  status = 'verified';
  explanation = `Direct product URL from trusted retailer - lowest price: $${bestMatch.price}`;
} else if (isTrustedSource) {
  status = 'verified';
  explanation = `Trusted retailer match - lowest price: $${bestMatch.price}`;
}
```

## Expected Behavior After Fix

### Test Case: "Synthetic Rubber Material Basketball" - Purchase Price: $25

**Before Fix:**
- ❌ Price: $35 (catalog URL, closer to $25)
- ❌ URL: Search/catalog URL
- ❌ Status: May be "Estimated"

**After Fix:**
- ✅ Price: $16.99 (direct product URL, lowest available)
- ✅ URL: Direct product URL (e.g., walmart.com/ip/...)
- ✅ Status: "Found"
- ✅ Source: Trusted retailer

## Key Principles Implemented

1. **Lowest Price Priority**: Always select the lowest price from trusted sources
2. **Direct URL Priority**: Direct product URLs are preferred over catalog/search URLs
3. **Trusted Source Priority**: Trusted retailers are preferred over untrusted sources
4. **Insurance Logic**: Optimize for lowest replacement cost, not proximity to original price

## Files Modified

- `server/models/InsuranceItemPricer.js`: Updated price selection and sorting logic
- `server/config/trustedSites.js`: Added missing untrusted sites (whatnot.com)
- `server/routes/enhancedProcessingRoutes.js`: Added missing analyzeProductType function

## Testing

Run the test to verify the fix:
```bash
node test/price-selection-fix-test.js
```

This test verifies that the system now correctly selects the lowest price from direct URLs over higher prices from catalog URLs.
