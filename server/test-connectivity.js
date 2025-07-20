#!/usr/bin/env node

/**
 * Simple Connectivity Test for NinjaVan and Dragonpay
 * Tests basic API responses without creating real orders or transactions
 */

require('dotenv').config();
const axios = require('axios');
const config = require('./config/keys');

console.log('🔍 Testing API Connectivity...\n');

// Test NinjaVan Connectivity
async function testNinjaVanConnectivity() {
  console.log('📦 Testing NinjaVan API Connectivity...');
  
  try {
    // Test 1: Check if we can reach the API base URL
    console.log('  Testing base URL connectivity...');
    const baseResponse = await axios.get(config.NINJAVAN_API_URL, {
      timeout: 10000,
      validateStatus: () => true // Accept any status code
    });
    
    console.log(`  ✅ Base URL reachable (Status: ${baseResponse.status})`);
    
    // Test 2: Check authentication endpoint (using the correct endpoint from your service)
    console.log('  Testing authentication endpoint...');
    const authUrl = `${config.NINJAVAN_API_URL}/${config.NINJAVAN_COUNTRY_CODE}/4.1/oauth/token`;
    
    try {
      const authResponse = await axios.post(authUrl, {
        client_id: "test_client_id",
        client_secret: "test_client_secret", 
        grant_type: "client_credentials"
      }, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      if (authResponse.status === 401) {
        console.log('  ✅ Authentication endpoint accessible (401 expected with test credentials)');
      } else if (authResponse.status === 400) {
        console.log('  ✅ Authentication endpoint accessible (400 expected with invalid credentials)');
      } else {
        console.log(`  ⚠️  Authentication endpoint responded with status: ${authResponse.status}`);
      }
      
      // Log the response for debugging
      if (authResponse.data) {
        console.log(`  📄 Response: ${JSON.stringify(authResponse.data).substring(0, 200)}...`);
      }
      
    } catch (authError) {
      console.log(`  ⚠️  Authentication endpoint test: ${authError.message}`);
      if (authError.response) {
        console.log(`    Status: ${authError.response.status}`);
        console.log(`    Data: ${JSON.stringify(authError.response.data).substring(0, 200)}...`);
      }
    }
    
    // Test 3: Try with actual credentials (if available)
    if (config.NINJAVAN_CLIENT_ID && config.NINJAVAN_CLIENT_SECRET) {
      console.log('  Testing with actual credentials...');
      try {
        const realAuthResponse = await axios.post(authUrl, {
          client_id: config.NINJAVAN_CLIENT_ID,
          client_secret: config.NINJAVAN_CLIENT_SECRET,
          grant_type: "client_credentials"
        }, {
          timeout: 10000,
          validateStatus: () => true
        });
        
        if (realAuthResponse.status === 200) {
          console.log('  ✅ Authentication successful with real credentials!');
          console.log(`    Token type: ${realAuthResponse.data.token_type}`);
          console.log(`    Expires in: ${realAuthResponse.data.expires_in} seconds`);
        } else {
          console.log(`  ⚠️  Real credentials test: Status ${realAuthResponse.status}`);
        }
      } catch (realAuthError) {
        console.log(`  ❌ Real credentials test failed: ${realAuthError.message}`);
      }
    }
    
    console.log('  📋 NinjaVan Configuration:');
    console.log(`    API URL: ${config.NINJAVAN_API_URL}`);
    console.log(`    Country Code: ${config.NINJAVAN_COUNTRY_CODE}`);
    console.log(`    Client ID: ${config.NINJAVAN_CLIENT_ID ? '✅ Set' : '❌ Not Set'}`);
    console.log(`    Client Secret: ${config.NINJAVAN_CLIENT_SECRET ? '✅ Set' : '❌ Not Set'}`);
    console.log(`    Auth Endpoint: ${authUrl}`);
    
    // Log configuration in the same format as Dragonpay
    console.log('\nNinjaVan Configuration: {');
    console.log(`  apiUrl: '${config.NINJAVAN_API_URL}',`);
    console.log(`  countryCode: '${config.NINJAVAN_COUNTRY_CODE}',`);
    console.log(`  clientId: '${config.NINJAVAN_CLIENT_ID || 'NOT_SET'}',`);
    console.log(`  clientSecretLength: ${config.NINJAVAN_CLIENT_SECRET ? config.NINJAVAN_CLIENT_SECRET.length : 0},`);
    console.log(`  clientSecretStartsWith: '${config.NINJAVAN_CLIENT_SECRET ? config.NINJAVAN_CLIENT_SECRET.substring(0, 4) + '...' : 'undefined'}',`);
    console.log(`  nodeEnv: '${process.env.NODE_ENV || 'development'}',`);
    console.log(`  authEndpoint: '${authUrl}'`);
    console.log('}');
    
  } catch (error) {
    console.log(`  ❌ NinjaVan connectivity failed: ${error.message}`);
    if (error.code === 'ENOTFOUND') {
      console.log('    💡 DNS resolution failed - check your internet connection');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('    💡 Connection refused - API might be down or URL incorrect');
    }
  }
}

// Test Dragonpay Connectivity
async function testDragonpayConnectivity() {
  console.log('\n🐉 Testing Dragonpay API Connectivity...');
  
  try {
    // Test 1: Check if we can reach the base URL
    console.log('  Testing base URL connectivity...');
    const baseUrl = config.DRAGONPAY_API_URL || 'https://gw.dragonpay.ph';
    
    try {
      const baseResponse = await axios.get(baseUrl, {
        timeout: 10000,
        validateStatus: () => true
      });
      console.log(`  ✅ Base URL reachable (Status: ${baseResponse.status})`);
    } catch (baseError) {
      console.log(`  ⚠️  Base URL test: ${baseError.message}`);
    }
    
    // Test 2: Check the Query endpoint (this is what was failing)
    console.log('  Testing Query endpoint...');
    const queryUrl = `${baseUrl}/Query.aspx`;
    
    try {
      const queryResponse = await axios.get(queryUrl, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      if (queryResponse.status === 404) {
        console.log('  ❌ Query endpoint not found (404) - this is the issue from your test');
        console.log('    💡 The Query.aspx endpoint might be deprecated or moved');
      } else {
        console.log(`  ✅ Query endpoint accessible (Status: ${queryResponse.status})`);
      }
    } catch (queryError) {
      console.log(`  ❌ Query endpoint test failed: ${queryError.message}`);
    }
    
    // Test 3: Check alternative endpoints
    console.log('  Testing alternative endpoints...');
    const alternativeEndpoints = [
      '/api/collect/v1',
      '/api/collect/v1/query',
      '/Pay.aspx',
      '/test/Pay.aspx'
    ];
    
    for (const endpoint of alternativeEndpoints) {
      try {
        const response = await axios.get(`${baseUrl}${endpoint}`, {
          timeout: 5000,
          validateStatus: () => true
        });
        console.log(`    ${endpoint}: ${response.status}`);
      } catch (error) {
        console.log(`    ${endpoint}: ${error.code || error.message}`);
      }
    }
    
    console.log('  📋 Dragonpay Configuration:');
    console.log(`    Base URL: ${baseUrl}`);
    console.log(`    Merchant ID: ${config.DRAGONPAY_MERCHANT_ID || '❌ Not Set'}`);
    console.log(`    Secret Key: ${config.DRAGONPAY_SECRET_KEY ? '✅ Set' : '❌ Not Set'}`);
    
  } catch (error) {
    console.log(`  ❌ Dragonpay connectivity failed: ${error.message}`);
  }
}

// Main test function
async function runConnectivityTests() {
  console.log('🚀 Starting connectivity tests...\n');
  
  await testNinjaVanConnectivity();
  await testDragonpayConnectivity();
  
  console.log('\n✅ Connectivity tests completed!');
  console.log('\n📝 Summary:');
  console.log('  - These tests only check if the APIs are reachable');
  console.log('  - No real orders or transactions are created');
  console.log('  - Use the results to verify your configuration');
}

// Run the tests
runConnectivityTests().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}); 