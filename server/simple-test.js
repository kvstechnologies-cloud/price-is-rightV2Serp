console.log('🧪 Starting simple test...');

try {
  const InsuranceItemPricer = require('./models/InsuranceItemPricer');
  console.log('✅ Module loaded successfully');
  
  const pricer = new InsuranceItemPricer();
  console.log('✅ Instance created successfully');
  
  console.log('\n🔍 Testing extractRetailerName method:');
  console.log('Amazon.com - Seller ->', pricer.extractRetailerName('Amazon.com - Seller'));
  console.log('Walmart - RRX ->', pricer.extractRetailerName('Walmart - RRX'));
  console.log('AI Estimated ->', pricer.extractRetailerName('AI Estimated'));
  console.log('null ->', pricer.extractRetailerName(null));
  console.log('undefined ->', pricer.extractRetailerName(undefined));
  
  console.log('\n🔍 Testing createFallbackSearchUrl method:');
  console.log('Empty query ->', pricer.createFallbackSearchUrl(''));
  console.log('Test item ->', pricer.createFallbackSearchUrl('Test Item'));
  console.log('With source ->', pricer.createFallbackSearchUrl('Test Item', 'amazon.com'));
  
  console.log('\n✅ All tests completed successfully!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
