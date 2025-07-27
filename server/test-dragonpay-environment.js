/**
 * Test Dragonpay Environment Configuration Fix
 * Verify that the correct URL is used based on environment
 */

const config = require('./config/keys');

console.log('=== DRAGONPAY ENVIRONMENT TEST ===');
console.log(`Current Environment: ${config.DRAGONPAY_ENV}`);
console.log(`Expected Behavior:`);

if (config.DRAGONPAY_ENV === 'sandbox') {
  console.log('  ✅ Should use: https://test.dragonpay.ph');
  console.log('  ❌ Should NOT use: https://gw.dragonpay.ph');
} else {
  console.log('  ✅ Should use: https://gw.dragonpay.ph');
  console.log('  ❌ Should NOT use: https://test.dragonpay.ph');
}

console.log('\n=== ACTUAL CONFIGURATION ===');
console.log(`DRAGONPAY_ENV: ${config.DRAGONPAY_ENV}`);
console.log(`DRAGONPAY_BASE_URL: ${config.DRAGONPAY_BASE_URL}`);
console.log(`DRAGONPAY_API_URL: ${config.DRAGONPAY_API_URL}`);

console.log('\n=== URL CONSTRUCTION TEST ===');
const testQueryParams = new URLSearchParams({
  merchantid: 'PAKBETTV',
  txnid: 'test_order_123',
  amount: '290.00',
  ccy: 'PHP',
  description: 'Test Order'
});

const redirectUrl = `${config.DRAGONPAY_BASE_URL}/Pay.aspx?${testQueryParams.toString()}`;
console.log('Constructed URL:', redirectUrl);

console.log('\n=== VALIDATION ===');
const isCorrectEnvironment = config.DRAGONPAY_ENV === 'sandbox' ? 
  redirectUrl.includes('test.dragonpay.ph') : 
  redirectUrl.includes('gw.dragonpay.ph');

console.log(`${isCorrectEnvironment ? '✅ PASS' : '❌ FAIL'}: Correct URL for ${config.DRAGONPAY_ENV} environment`);

if (config.DRAGONPAY_ENV === 'sandbox' && redirectUrl.includes('gw.dragonpay.ph')) {
  console.log('❌ ERROR: Using production URL in sandbox mode!');
} else if (config.DRAGONPAY_ENV === 'production' && redirectUrl.includes('test.dragonpay.ph')) {
  console.log('❌ ERROR: Using sandbox URL in production mode!');
} else {
  console.log('✅ SUCCESS: Environment-based URL is correct!');
}

console.log('\n🎯 The fix should now use the correct DragonPay URL based on environment settings.');
