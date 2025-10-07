/**
 * GPT-5 Configuration Utility
 * Manages feature flags and model selection for GPT-5 rollout
 */

class GPT5Config {
  constructor() {
    this.useGPT5 = process.env.USE_GPT5 === 'true';
    this.useGPT5Thinking = process.env.USE_GPT5_THINKING === 'true';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.gpt5AccessAvailable = true; // Will be updated after first API call
    
    // Log configuration on startup
    this.logConfiguration();
  }

  /**
   * Mark GPT-5 access as unavailable (called when we get a 404)
   */
  markGPT5Unavailable() {
    if (this.gpt5AccessAvailable) {
      console.log('⚠️  GPT-5 access not available, falling back to GPT-4o models');
      this.gpt5AccessAvailable = false;
    }
  }

  /**
   * Get the appropriate vision model based on feature flags and access
   * @returns {string} Model name to use
   */
  getVisionModel() {
    if (!this.useGPT5 || !this.gpt5AccessAvailable) {
      return 'gpt-4o';
    }
    
    if (this.useGPT5Thinking) {
      return 'gpt-5-thinking';
    }
    
    return 'gpt-5';
  }

  /**
   * Get the appropriate text model based on feature flags and access
   * @returns {string} Model name to use
   */
  getTextModel() {
    if (!this.useGPT5 || !this.gpt5AccessAvailable) {
      return 'gpt-4o-mini';
    }
    
    if (this.useGPT5Thinking) {
      return 'gpt-5-thinking';
    }
    
    return 'gpt-5-mini';
  }

  /**
   * Check if GPT-5 is enabled
   * @returns {boolean}
   */
  isGPT5Enabled() {
    return this.useGPT5 && this.gpt5AccessAvailable;
  }

  /**
   * Check if GPT-5 thinking mode is enabled
   * @returns {boolean}
   */
  isGPT5ThinkingEnabled() {
    return this.useGPT5 && this.useGPT5Thinking && this.gpt5AccessAvailable;
  }

  /**
   * Get model info for debugging
   * @returns {object} Model configuration info
   */
  getModelInfo() {
    return {
      gpt5Enabled: this.useGPT5,
      gpt5AccessAvailable: this.gpt5AccessAvailable,
      gpt5ThinkingEnabled: this.useGPT5Thinking,
      currentVisionModel: this.getVisionModel(),
      currentTextModel: this.getTextModel(),
      environment: process.env.NODE_ENV || 'development',
      featureFlags: {
        USE_GPT5: process.env.USE_GPT5,
        USE_GPT5_THINKING: process.env.USE_GPT5_THINKING
      }
    };
  }

  /**
   * Log configuration on startup
   */
  logConfiguration() {
    console.log('🤖 GPT-5 Configuration:');
    console.log(`   Environment: ${this.isDevelopment ? 'Development' : 'Production'}`);
    console.log(`   GPT-5 Enabled: ${this.useGPT5 ? '✅ YES' : '❌ NO'}`);
    console.log(`   GPT-5 Thinking: ${this.useGPT5Thinking ? '✅ YES' : '❌ NO'}`);
    console.log(`   Vision Model: ${this.getVisionModel()}`);
    console.log(`   Text Model: ${this.getTextModel()}`);
    console.log('');
  }

  /**
   * Validate configuration
   * @returns {object} Validation result
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Check if GPT-5 is enabled in production
    if (!this.isDevelopment && this.useGPT5) {
      warnings.push('GPT-5 is enabled in production environment');
    }

    // Check if thinking mode is enabled without GPT-5
    if (this.useGPT5Thinking && !this.useGPT5) {
      errors.push('USE_GPT5_THINKING requires USE_GPT5 to be enabled');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Create singleton instance
const gpt5Config = new GPT5Config();

// Validate configuration on startup
const validation = gpt5Config.validate();
if (!validation.isValid) {
  console.error('❌ GPT-5 Configuration Errors:');
  validation.errors.forEach(error => console.error(`   ${error}`));
}
if (validation.warnings.length > 0) {
  console.warn('⚠️  GPT-5 Configuration Warnings:');
  validation.warnings.forEach(warning => console.warn(`   ${warning}`));
}

module.exports = gpt5Config;
