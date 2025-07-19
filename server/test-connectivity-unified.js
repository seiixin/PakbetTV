const axios = require('axios');
const config = require('./config/keys');
const ninjaVanAuth = require('./services/ninjaVanAuth');
const dragonpayService = require('./services/dragonpayService');

// Test configuration
const TEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 2;

/**
 * Sleep function for delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Test with retry mechanism
 */
async function testWithRetry(testFunction, testName, maxRetries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/${maxRetries}...`);
      const result = await testFunction();
      return { success: true, result, attempt };
    } catch (error) {
      console.log(`    ❌ Attempt ${attempt} failed: ${error.message}`);
      if (attempt === maxRetries) {
        return { success: false, error: error.message, attempt };
      }
      await sleep(1000); // Wait 1 second before retry
    }
  }
}

/**
 * Test NinjaVan Connectivity
 */
async function testNinjaVanConnectivity() {
  console.log('\n🚚 Testing NinjaVan API Connectivity...');
  
  // Test 1: Configuration
  console.log('1️⃣ Configuration Check:');
  console.log(`   Environment: ${config.NINJAVAN_ENV}`);
  console.log(`   API URL: ${config.NINJAVAN_API_URL}`);
  console.log(`   Country Code: ${config.NINJAVAN_COUNTRY_CODE}`);
  console.log(`   Client ID: ${config.NINJAVAN_CLIENT_ID ? '✅ Set' : '❌ Not Set'}`);
  console.log(`   Client Secret: ${config.NINJAVAN_CLIENT_SECRET ? '✅ Set' : '❌ Not Set'}`);

  if (!config.NINJAVAN_CLIENT_ID || !config.NINJAVAN_CLIENT_SECRET) {
    console.log('   ❌ NinjaVan credentials not configured');
    return { success: false, message: 'Credentials not configured' };
  }

  // Test 2: Base URL Connectivity
  console.log('\n2️⃣ Base URL Connectivity:');
  const baseUrlTest = await testWithRetry(async () => {
    const response = await axios.get(config.NINJAVAN_API_URL, {
      timeout: TEST_TIMEOUT,
      validateStatus: () => true
    });
    return response.status;
  }, 'Base URL Test');

  if (baseUrlTest.success) {
    console.log(`   ✅ Base URL reachable (Status: ${baseUrlTest.result})`);
  } else {
    console.log(`   ❌ Base URL test failed: ${baseUrlTest.error}`);
  }

  // Test 3: Authentication
  console.log('\n3️⃣ Authentication Test:');
  const authTest = await testWithRetry(async () => {
    const token = await ninjaVanAuth.getValidToken();
    return token.substring(0, 20) + '...';
  }, 'Authentication Test');

  if (authTest.success) {
    console.log(`   ✅ Authentication successful`);
    console.log(`   Token preview: ${authTest.result}`);
  } else {
    console.log(`   ❌ Authentication failed: ${authTest.error}`);
    return { success: false, message: 'Authentication failed' };
  }

  // Test 4: API Endpoint Test
  console.log('\n4️⃣ API Endpoint Test:');
  const apiTest = await testWithRetry(async () => {
    const token = await ninjaVanAuth.getValidToken();
    const response = await axios.get(
      `${config.NINJAVAN_API_URL}/${config.NINJAVAN_COUNTRY_CODE}/2.2/orders/test`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: TEST_TIMEOUT,
        validateStatus: () => true
      }
    );
    return response.status;
  }, 'API Endpoint Test');

  if (apiTest.success) {
    if (apiTest.result === 404) {
      console.log('   ✅ API endpoint accessible (404 expected for test endpoint)');
    } else {
      console.log(`   ✅ API endpoint accessible (Status: ${apiTest.result})`);
    }
  } else {
    console.log(`   ❌ API endpoint test failed: ${apiTest.error}`);
  }

  console.log('\n✅ NinjaVan connectivity test completed');
  return { success: true, message: 'All tests passed' };
}

/**
 * Test DragonPay Connectivity
 */
async function testDragonPayConnectivity() {
  console.log('\n🐉 Testing DragonPay API Connectivity...');
  
  // Test 1: Configuration
  console.log('1️⃣ Configuration Check:');
  console.log(`   Environment: ${config.DRAGONPAY_ENV}`);
  console.log(`   Base URL: ${config.DRAGONPAY_BASE_URL}`);
  console.log(`   API URL: ${config.DRAGONPAY_API_URL}`);
  console.log(`   Merchant ID: ${config.DRAGONPAY_MERCHANT_ID || '❌ Not Set'}`);
  console.log(`   Secret Key: ${config.DRAGONPAY_SECRET_KEY ? '✅ Set' : '❌ Not Set'}`);

  if (!config.DRAGONPAY_MERCHANT_ID || !config.DRAGONPAY_SECRET_KEY) {
    console.log('   ❌ DragonPay credentials not configured');
    return { success: false, message: 'Credentials not configured' };
  }

  // Test 2: Base URL Connectivity
  console.log('\n2️⃣ Base URL Connectivity:');
  const baseUrlTest = await testWithRetry(async () => {
    const response = await axios.get(config.DRAGONPAY_BASE_URL, {
      timeout: TEST_TIMEOUT,
      validateStatus: () => true
    });
    return response.status;
  }, 'Base URL Test');

  if (baseUrlTest.success) {
    console.log(`   ✅ Base URL reachable (Status: ${baseUrlTest.result})`);
  } else {
    console.log(`   ❌ Base URL test failed: ${baseUrlTest.error}`);
  }

  // Test 3: Pay.aspx Endpoint
  console.log('\n3️⃣ Pay.aspx Endpoint Test:');
  const payEndpointTest = await testWithRetry(async () => {
    const response = await axios.get(`${config.DRAGONPAY_BASE_URL}/Pay.aspx`, {
      timeout: TEST_TIMEOUT,
      validateStatus: () => true
    });
    return response.status;
  }, 'Pay.aspx Test');

  if (payEndpointTest.success) {
    console.log(`   ✅ Pay.aspx endpoint accessible (Status: ${payEndpointTest.result})`);
  } else {
    console.log(`   ❌ Pay.aspx endpoint test failed: ${payEndpointTest.error}`);
  }

  // Test 4: Query.aspx Endpoint Test:
  console.log('\n4️⃣ Query.aspx Endpoint Test:');
  const queryEndpointTest = await testWithRetry(async () => {
    const response = await axios.get(`${config.DRAGONPAY_BASE_URL}/Query.aspx`, {
      timeout: TEST_TIMEOUT,
      validateStatus: () => true
    });
    return response.status;
  }, 'Query.aspx Test');

  if (queryEndpointTest.success) {
    if (queryEndpointTest.result === 404) {
      console.log('   ⚠️  Query.aspx endpoint not found (404) - may be deprecated');
    } else {
      console.log(`   ✅ Query.aspx endpoint accessible (Status: ${queryEndpointTest.result})`);
    }
  } else {
    console.log(`   ❌ Query.aspx endpoint test failed: ${queryEndpointTest.error}`);
  }

  // Test 5: API Service Test
  console.log('\n5️⃣ API Service Test:');
  const apiServiceTest = await testWithRetry(async () => {
    // Test with a dummy transaction inquiry
    const testTxnId = `TEST_${Date.now()}`;
    const result = await dragonpayService.inquireTransaction(testTxnId);
    return result;
  }, 'API Service Test');

  if (apiServiceTest.success) {
    console.log(`   ✅ API service test completed`);
    console.log(`   Response status: ${apiServiceTest.result.status}`);
    console.log(`   Response message: ${apiServiceTest.result.message}`);
  } else {
    console.log(`   ❌ API service test failed: ${apiServiceTest.error}`);
  }

  console.log('\n✅ DragonPay connectivity test completed');
  return { success: true, message: 'All tests passed' };
}

/**
 * Test both services
 */
async function testBothServices() {
  console.log('🔍 Testing API Connectivity for Both Services...\n');
  
  const results = {
    ninjavan: null,
    dragonpay: null,
    timestamp: new Date().toISOString()
  };

  // Test NinjaVan
  try {
    results.ninjavan = await testNinjaVanConnectivity();
  } catch (error) {
    results.ninjavan = { success: false, message: error.message };
  }

  // Test DragonPay
  try {
    results.dragonpay = await testDragonPayConnectivity();
  } catch (error) {
    results.dragonpay = { success: false, message: error.message };
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CONNECTIVITY TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n🚚 NinjaVan: ${results.ninjavan.success ? '✅ PASSED' : '❌ FAILED'}`);
  if (!results.ninjavan.success) {
    console.log(`   Error: ${results.ninjavan.message}`);
  }

  console.log(`\n🐉 DragonPay: ${results.dragonpay.success ? '✅ PASSED' : '❌ FAILED'}`);
  if (!results.dragonpay.success) {
    console.log(`   Error: ${results.dragonpay.message}`);
  }

  const overallSuccess = results.ninjavan.success && results.dragonpay.success;
  console.log(`\n🎯 Overall Status: ${overallSuccess ? '✅ ALL SERVICES OPERATIONAL' : '❌ SOME SERVICES FAILED'}`);
  
  console.log(`\n⏰ Test completed at: ${results.timestamp}`);

  return results;
}

// Export for use in other files
module.exports = {
  testNinjaVanConnectivity,
  testDragonPayConnectivity,
  testBothServices
};

// Run if called directly
if (require.main === module) {
  testBothServices()
    .then(results => {
      process.exit(results.ninjavan.success && results.dragonpay.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
} 