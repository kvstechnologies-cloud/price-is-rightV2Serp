// Centralized shared services to prevent multiple instances
// This ensures all routes use the same instance with consistent configuration

let InsuranceItemPricer;
let sharedInsuranceItemPricer;

try {
  InsuranceItemPricer = require('../models/InsuranceItemPricer');
  sharedInsuranceItemPricer = new InsuranceItemPricer();
  console.log('✅ Shared InsuranceItemPricer initialized successfully');
  console.log('🔍 SERPAPI_KEY status in shared service:', {
    hasKey: !!process.env.SERPAPI_KEY,
    keyLength: process.env.SERPAPI_KEY ? process.env.SERPAPI_KEY.length : 0,
    keyPreview: process.env.SERPAPI_KEY ? process.env.SERPAPI_KEY.substring(0, 10) + '...' : 'undefined'
  });
  console.log('🔍 sharedInsuranceItemPricer.serpApiKey status:', {
    hasKey: !!sharedInsuranceItemPricer.serpApiKey,
    keyLength: sharedInsuranceItemPricer.serpApiKey ? sharedInsuranceItemPricer.serpApiKey.length : 0,
    keyPreview: sharedInsuranceItemPricer.serpApiKey ? sharedInsuranceItemPricer.serpApiKey.substring(0, 10) + '...' : 'undefined'
  });
  
  // Additional safety check - verify the instance is working
  if (!sharedInsuranceItemPricer.serpApiKey) {
    console.warn('⚠️ WARNING: Shared InsuranceItemPricer instance has no SERPAPI_KEY - will use intelligent estimation mode');
  } else {
    console.log('✅ Shared InsuranceItemPricer instance is fully configured with SERPAPI_KEY');
  }
  
} catch (error) {
  console.error('❌ Failed to initialize shared InsuranceItemPricer:', error.message);
  sharedInsuranceItemPricer = null;
}

// Enhanced getter with validation
function getInsuranceItemPricer() {
  if (!sharedInsuranceItemPricer) {
    console.error('❌ Shared InsuranceItemPricer instance not available');
    return null;
  }
  
  // Additional runtime check
  if (!sharedInsuranceItemPricer.serpApiKey) {
    console.warn('⚠️ Runtime warning: Shared InsuranceItemPricer instance has no SERPAPI_KEY');
  }
  
  return sharedInsuranceItemPricer;
}

module.exports = {
  getInsuranceItemPricer,
  InsuranceItemPricer: InsuranceItemPricer // Export the class for testing purposes
};
