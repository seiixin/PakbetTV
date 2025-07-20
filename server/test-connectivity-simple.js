const axios = require('axios');
const config = require('./config/keys');

async function simpleConnectivityTest() {
  console.log('🔍 Quick API Connectivity Test\n');
  
  const results = {
    ninjavan: false,
    dragonpay: false,
    timestamp: new Date().toISOString()
  };

  // Test NinjaVan
  console.log('🚚 Testing NinjaVan...');
  try {
    const response = await axios.get(config.NINJAVAN_API_URL, {
      timeout: 5000,
      validateStatus: () => true
    });
    console.log(`   ✅ Base URL reachable (${response.status})`);
    results.ninjavan = true;
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
  }

  // Test DragonPay
  console.log('\n🐉 Testing DragonPay...');
  try {
    const response = await axios.get(config.DRAGONPAY_BASE_URL, {
      timeout: 5000,
      validateStatus: () => true
    });
    console.log(`   ✅ Base URL reachable (${response.status})`);
    results.dragonpay = true;
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   NinjaVan: ${results.ninjavan ? '✅' : '❌'}`);
  console.log(`   DragonPay: ${results.dragonpay ? '✅' : '❌'}`);
  console.log(`   Overall: ${results.ninjavan && results.dragonpay ? '✅ All OK' : '❌ Issues Found'}`);

  return results;
}

// Run if called directly
if (require.main === module) {
  simpleConnectivityTest()
    .then(results => {
      process.exit(results.ninjavan && results.dragonpay ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { simpleConnectivityTest }; 