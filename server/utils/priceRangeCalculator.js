/**
 * Price Range Calculator
 * Calculates price ranges based on tolerance percentage
 * Example: 10% tolerance on $10 = $9-$11 range
 */

class PriceRangeCalculator {
  /**
   * Calculate price range based on tolerance
   * @param {number} price - Base price
   * @param {number} tolerance - Tolerance percentage (e.g., 10 for 10%)
   * @returns {Object} Price range with min, max, and tolerance info
   */
  static calculateRange(price, tolerance) {
    if (!price || price <= 0) {
      throw new Error('Price must be greater than 0');
    }
    
    if (!tolerance || tolerance <= 0) {
      throw new Error('Tolerance must be greater than 0');
    }

    const toleranceFraction = tolerance / 100;
    const minPrice = price * (1 - toleranceFraction);
    const maxPrice = price * (1 + toleranceFraction);

    return {
      basePrice: price,
      tolerance: tolerance,
      minPrice: Math.round(minPrice * 100) / 100, // Round to 2 decimal places
      maxPrice: Math.round(maxPrice * 100) / 100, // Round to 2 decimal places
      range: `${minPrice.toFixed(2)}-${maxPrice.toFixed(2)}`,
      formattedRange: `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`
    };
  }

  /**
   * Check if a price falls within the calculated range
   * @param {number} price - Price to check
   * @param {number} basePrice - Base price for range calculation
   * @param {number} tolerance - Tolerance percentage
   * @returns {boolean} True if price is within range
   */
  static isWithinRange(price, basePrice, tolerance) {
    const range = this.calculateRange(basePrice, tolerance);
    return price >= range.minPrice && price <= range.maxPrice;
  }

  /**
   * Calculate multiple price ranges for batch processing
   * @param {Array} items - Array of items with price and tolerance
   * @returns {Array} Array of items with calculated price ranges
   */
  static calculateBatchRanges(items) {
    return items.map(item => {
      const range = this.calculateRange(item.price, item.tolerance);
      return {
        ...item,
        priceRange: range
      };
    });
  }

  /**
   * Format price range for display
   * @param {number} minPrice - Minimum price
   * @param {number} maxPrice - Maximum price
   * @returns {string} Formatted price range string
   */
  static formatRange(minPrice, maxPrice) {
    return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
  }
}

module.exports = PriceRangeCalculator;
