/**
 * Price Tolerance Validator
 * Validates pricing results against tolerance thresholds and compliance rules
 * Ensures all prices meet insurance claim requirements
 */

class PriceToleranceValidator {
  constructor() {
    this.defaultTolerance = 10; // 10% default tolerance
    this.maxTolerance = 50; // 50% maximum allowed tolerance
    this.minPrice = 1.0; // Minimum price floor
    this.maxPrice = 50000; // Maximum reasonable price
    
    // Category-specific tolerance rules
    this.categoryTolerances = {
      'Electronics': { min: 5, max: 30, typical: 15 },
      'Appliances': { min: 10, max: 40, typical: 20 },
      'Furniture': { min: 15, max: 50, typical: 25 },
      'Tools': { min: 5, max: 25, typical: 12 },
      'Kitchen': { min: 8, max: 35, typical: 18 },
      'Bathroom': { min: 10, max: 40, typical: 20 },
      'Office': { min: 5, max: 30, typical: 15 },
      'Storage': { min: 15, max: 45, typical: 25 },
      'General': { min: 10, max: 40, typical: 20 }
    };
  }

  /**
   * Validate price against tolerance and compliance rules
   * @param {Object} result - Pricing result from pipeline
   * @param {number} targetPrice - Original/expected price
   * @param {number} tolerance - Tolerance percentage (optional)
   * @param {Object} facts - Product facts for context
   * @returns {Object} Validation result with compliance status
   */
  validatePrice(result, targetPrice, tolerance = null, facts = {}) {
    console.log('🔍 PRICE VALIDATION: Starting validation', {
      resultPrice: result.adjustedPrice,
      targetPrice,
      tolerance,
      category: facts.category
    });

    const validation = {
      isValid: true,
      isCompliant: true,
      withinTolerance: true,
      warnings: [],
      errors: [],
      adjustments: [],
      finalPrice: result.adjustedPrice,
      confidence: result.confidence || 0.5
    };

    // Step 1: Basic price validation
    const basicValidation = this.validateBasicPrice(result.adjustedPrice);
    if (!basicValidation.isValid) {
      validation.isValid = false;
      validation.errors.push(...basicValidation.errors);
      
      // Apply emergency correction
      validation.finalPrice = Math.max(this.minPrice, targetPrice || 50);
      validation.adjustments.push(`Emergency price correction: $${validation.finalPrice}`);
    }

    // Step 2: Tolerance validation (if target price provided)
    if (targetPrice && targetPrice > 0) {
      const toleranceValidation = this.validateTolerance(
        validation.finalPrice, 
        targetPrice, 
        tolerance, 
        facts.category
      );
      
      validation.withinTolerance = toleranceValidation.withinTolerance;
      validation.warnings.push(...toleranceValidation.warnings);
      
      if (!toleranceValidation.withinTolerance) {
        validation.confidence *= 0.7; // Reduce confidence for out-of-tolerance prices
      }
    }

    // Step 3: Category-specific validation
    const categoryValidation = this.validateByCategory(validation.finalPrice, facts);
    validation.warnings.push(...categoryValidation.warnings);
    
    if (categoryValidation.suggestedAdjustment) {
      validation.adjustments.push(categoryValidation.suggestedAdjustment);
    }

    // Step 4: Pricing tier compliance
    const tierValidation = this.validatePricingTier(result, facts);
    validation.warnings.push(...tierValidation.warnings);
    validation.confidence = Math.min(validation.confidence, tierValidation.maxConfidence);

    // Step 5: Final compliance check
    validation.isCompliant = validation.isValid && 
                           validation.errors.length === 0 && 
                           validation.finalPrice >= this.minPrice;

    console.log('✅ PRICE VALIDATION: Complete', {
      isValid: validation.isValid,
      isCompliant: validation.isCompliant,
      withinTolerance: validation.withinTolerance,
      finalPrice: validation.finalPrice,
      confidence: validation.confidence,
      warningsCount: validation.warnings.length,
      errorsCount: validation.errors.length
    });

    return validation;
  }

  /**
   * Validate basic price constraints
   */
  validateBasicPrice(price) {
    const validation = { isValid: true, errors: [] };

    if (!price || isNaN(price)) {
      validation.isValid = false;
      validation.errors.push('Price is not a valid number');
      return validation;
    }

    if (price < this.minPrice) {
      validation.isValid = false;
      validation.errors.push(`Price $${price} is below minimum threshold $${this.minPrice}`);
    }

    if (price > this.maxPrice) {
      validation.isValid = false;
      validation.errors.push(`Price $${price} exceeds maximum threshold $${this.maxPrice}`);
    }

    return validation;
  }

  /**
   * Validate price against tolerance thresholds
   */
  validateTolerance(price, targetPrice, tolerance, category) {
    const validation = { withinTolerance: true, warnings: [] };

    // Determine effective tolerance
    let effectiveTolerance = tolerance || this.defaultTolerance;
    
    // Apply category-specific tolerance if available
    if (category && this.categoryTolerances[category]) {
      const categoryTolerance = this.categoryTolerances[category].typical;
      if (!tolerance) {
        effectiveTolerance = categoryTolerance;
      }
    }

    // Ensure tolerance is within reasonable bounds
    effectiveTolerance = Math.min(effectiveTolerance, this.maxTolerance);

    // Calculate tolerance range
    const lowerBound = targetPrice * (1 - effectiveTolerance / 100);
    const upperBound = targetPrice * (1 + effectiveTolerance / 100);

    console.log('🔍 TOLERANCE CHECK:', {
      price,
      targetPrice,
      effectiveTolerance,
      lowerBound,
      upperBound,
      category
    });

    // Check if within tolerance
    if (price < lowerBound || price > upperBound) {
      validation.withinTolerance = false;
      const deviation = Math.abs(((price - targetPrice) / targetPrice) * 100);
      validation.warnings.push(
        `Price $${price} is ${deviation.toFixed(1)}% away from target $${targetPrice} (tolerance: ±${effectiveTolerance}%)`
      );
    }

    // Additional warnings for extreme deviations
    if (price < targetPrice * 0.5) {
      validation.warnings.push('Price is significantly lower than expected - verify product match');
    }
    
    if (price > targetPrice * 2) {
      validation.warnings.push('Price is significantly higher than expected - consider alternatives');
    }

    return validation;
  }

  /**
   * Validate price by product category
   */
  validateByCategory(price, facts) {
    const validation = { warnings: [], suggestedAdjustment: null };
    const category = facts.category || 'General';

    // Category-specific price ranges (rough guidelines)
    const categoryRanges = {
      'Electronics': { min: 50, max: 5000, typical: 300 },
      'Appliances': { min: 100, max: 8000, typical: 500 },
      'Furniture': { min: 50, max: 3000, typical: 400 },
      'Tools': { min: 20, max: 2000, typical: 150 },
      'Kitchen': { min: 25, max: 1500, typical: 200 },
      'Bathroom': { min: 30, max: 1000, typical: 150 },
      'Office': { min: 20, max: 2000, typical: 250 },
      'Storage': { min: 25, max: 800, typical: 120 },
      'General': { min: 10, max: 1000, typical: 100 }
    };

    const range = categoryRanges[category] || categoryRanges['General'];

    if (price < range.min) {
      validation.warnings.push(
        `Price $${price} is unusually low for ${category} (typical minimum: $${range.min})`
      );
    }

    if (price > range.max) {
      validation.warnings.push(
        `Price $${price} is unusually high for ${category} (typical maximum: $${range.max})`
      );
      
      // Suggest using typical price if extremely high
      if (price > range.max * 2) {
        validation.suggestedAdjustment = `Consider typical ${category} price: $${range.typical}`;
      }
    }

    return validation;
  }

  /**
   * Validate pricing tier appropriateness
   */
  validatePricingTier(result, facts) {
    const validation = { warnings: [], maxConfidence: 1.0 };
    const tier = result.pricingTier || 'NONE';

    switch (tier) {
      case 'SERP':
        // Highest confidence for exact matches
        validation.maxConfidence = 0.95;
        if (result.confidence < 0.45) {
          validation.warnings.push('SERP result has low similarity score - verify match quality');
        }
        break;

      case 'FALLBACK':
        // Good confidence for fallback searches
        validation.maxConfidence = 0.85;
        validation.warnings.push('Used fallback search due to SerpAPI unavailability');
        break;

      case 'AGGREGATED':
        // Medium confidence for aggregated estimates
        validation.maxConfidence = 0.75;
        validation.warnings.push('Price estimated from market data aggregation');
        break;

      case 'BASELINE':
        // Lower confidence for baseline estimates
        validation.maxConfidence = 0.6;
        validation.warnings.push('Using category baseline - consider manual review for accuracy');
        break;

      case 'NONE':
      default:
        // Lowest confidence for unknown tiers
        validation.maxConfidence = 0.4;
        validation.warnings.push('Unknown pricing method - manual review recommended');
        break;
    }

    return validation;
  }

  /**
   * Get recommended tolerance for a category
   */
  getRecommendedTolerance(category) {
    if (category && this.categoryTolerances[category]) {
      return this.categoryTolerances[category].typical;
    }
    return this.defaultTolerance;
  }

  /**
   * Check if price requires manual review
   */
  requiresManualReview(validation, result, facts) {
    // Manual review required if:
    // 1. Validation failed
    // 2. Multiple errors
    // 3. Very low confidence
    // 4. Extreme price deviation
    
    if (!validation.isValid || !validation.isCompliant) {
      return { required: true, reason: 'Validation failed' };
    }

    if (validation.errors.length > 0) {
      return { required: true, reason: 'Price validation errors detected' };
    }

    if (validation.confidence < 0.3) {
      return { required: true, reason: 'Very low confidence in price accuracy' };
    }

    if (!validation.withinTolerance && validation.warnings.length > 2) {
      return { required: true, reason: 'Multiple pricing concerns detected' };
    }

    return { required: false, reason: 'Price validation passed' };
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(validationResults) {
    const total = validationResults.length;
    const valid = validationResults.filter(v => v.isValid).length;
    const compliant = validationResults.filter(v => v.isCompliant).length;
    const withinTolerance = validationResults.filter(v => v.withinTolerance).length;
    const manualReview = validationResults.filter(v => 
      this.requiresManualReview(v, {}, {}).required
    ).length;

    const avgConfidence = validationResults.reduce((sum, v) => sum + v.confidence, 0) / total;

    return {
      summary: {
        totalItems: total,
        validPrices: valid,
        compliantPrices: compliant,
        withinTolerance: withinTolerance,
        manualReviewRequired: manualReview,
        averageConfidence: Math.round(avgConfidence * 100) / 100
      },
      rates: {
        validityRate: Math.round((valid / total) * 100),
        complianceRate: Math.round((compliant / total) * 100),
        toleranceRate: Math.round((withinTolerance / total) * 100),
        manualReviewRate: Math.round((manualReview / total) * 100)
      },
      recommendations: this.generateRecommendations(validationResults)
    };
  }

  /**
   * Generate recommendations based on validation results
   */
  generateRecommendations(validationResults) {
    const recommendations = [];
    const total = validationResults.length;

    // Check for common issues
    const lowConfidenceCount = validationResults.filter(v => v.confidence < 0.5).length;
    const outOfToleranceCount = validationResults.filter(v => !v.withinTolerance).length;
    const baselineCount = validationResults.filter(v => 
      v.warnings.some(w => w.includes('baseline'))
    ).length;

    if (lowConfidenceCount > total * 0.3) {
      recommendations.push({
        type: 'warning',
        message: `${lowConfidenceCount} items have low confidence scores`,
        action: 'Consider manual review for accuracy verification'
      });
    }

    if (outOfToleranceCount > total * 0.2) {
      recommendations.push({
        type: 'info',
        message: `${outOfToleranceCount} items are outside tolerance range`,
        action: 'Review tolerance settings or target prices'
      });
    }

    if (baselineCount > total * 0.4) {
      recommendations.push({
        type: 'warning',
        message: `${baselineCount} items using baseline pricing`,
        action: 'Consider improving product descriptions for better matches'
      });
    }

    return recommendations;
  }
}

module.exports = { PriceToleranceValidator };
