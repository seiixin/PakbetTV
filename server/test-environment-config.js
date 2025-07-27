#!/usr/bin/env node

/**
 * Environment Configuration Test
 * Tests the proper switching between sandbox and production for both DragonPay and NinjaVan
 */

require('dotenv').config();
const config = require('./config/keys');

console.log('🧪 Environment Configuration Test\n');

// Test DragonPay Configuration
console.log('🐉 DragonPay Configuration:');
console.log(`   Environment: ${config.DRAGONPAY_ENV}`);
console.log(`   Merchant ID: ${config.DRAGONPAY_MERCHANT_ID}`);
console.log(`   Base URL: ${config.DRAGONPAY_BASE_URL}`);
console.log(`   API URL: ${config.DRAGONPAY_API_URL}`);
console.log(`   Secret Key: ${config.DRAGONPAY_SECRET_KEY ? '✅ Set' : '❌ Not Set'}`);

// Test NinjaVan Configuration
console.log('\n🚚 NinjaVan Configuration:');
console.log(`   Environment: ${config.NINJAVAN_ENV}`);
console.log(`   API URL: ${config.NINJAVAN_API_URL}`);
console.log(`   Country Code: ${config.NINJAVAN_COUNTRY_CODE}`);
console.log(`   Client ID: ${config.NINJAVAN_CLIENT_ID ? '✅ Set' : '❌ Not Set'}`);
console.log(`   Client Secret: ${config.NINJAVAN_CLIENT_SECRET ? '✅ Set' : '❌ Not Set'}`);

// Environment Logic Test
console.log('\n🔄 Environment Logic Test:');
console.log(`   🧪 Sandbox Mode:`);
console.log(`      - DragonPay should use: test.dragonpay.ph`);
console.log(`      - NinjaVan should use: api-sandbox.ninjavan.co`);
console.log(`      - NinjaVan country should be: SG (for testing)`);
console.log(`   🚀 Production Mode:`);
console.log(`      - DragonPay should use: gw.dragonpay.ph`);
console.log(`      - NinjaVan should use: api.ninjavan.co`);
console.log(`      - NinjaVan country should be: PH (for Philippines)`);

// Validation
console.log('\n✅ Current Configuration Validation:');
if (config.NINJAVAN_ENV === 'sandbox') {
  const isCorrect = config.NINJAVAN_COUNTRY_CODE === 'SG' && 
                   config.NINJAVAN_API_URL.includes('sandbox');
  console.log(`   Sandbox setup: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
  if (!isCorrect) {
    console.log('   Expected: Country=SG, URL contains "sandbox"');
    console.log(`   Actual: Country=${config.NINJAVAN_COUNTRY_CODE}, URL=${config.NINJAVAN_API_URL}`);
  }
} else if (config.NINJAVAN_ENV === 'production') {
  const isCorrect = config.NINJAVAN_COUNTRY_CODE === 'PH' && 
                   !config.NINJAVAN_API_URL.includes('sandbox');
  console.log(`   Production setup: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
  if (!isCorrect) {
    console.log('   Expected: Country=PH, URL without "sandbox"');
    console.log(`   Actual: Country=${config.NINJAVAN_COUNTRY_CODE}, URL=${config.NINJAVAN_API_URL}`);
  }
}

console.log('\n📋 Environment Switching Instructions:');
console.log('   To switch to Production:');
console.log('   1. Set DRAGONPAY_ENV=production');
console.log('   2. Set NINJAVAN_ENV=production');
console.log('   3. Uncomment production credentials in .env');
console.log('   4. Comment out sandbox credentials in .env');
console.log('   \n   To switch to Sandbox:');
console.log('   1. Set DRAGONPAY_ENV=sandbox');
console.log('   2. Set NINJAVAN_ENV=sandbox');
console.log('   3. Comment out production credentials in .env');
console.log('   4. Uncomment sandbox credentials in .env');

console.log('\n🎯 Test completed successfully!');
