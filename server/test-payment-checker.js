#!/usr/bin/env node

/**
 * Test script for Payment Status Checker System
 * 
 * Usage: node test-payment-checker.js [action]
 * 
 * Actions:
 *   check-pending    - Check all pending payments
 *   inquiry <txnId>  - Check specific transaction
 *   status          - Get service status
 *   test-connection - Test Dragonpay API connection
 */

require('dotenv').config();
const dragonpayService = require('./services/dragonpayService');
const paymentStatusChecker = require('./services/paymentStatusChecker');

async function main() {
  const action = process.argv[2];
  const txnId = process.argv[3];

  console.log('🧪 Payment Status Checker Test Script');
  console.log('=====================================\n');

  try {
    switch (action) {
      case 'check-pending':
        console.log('📋 Checking all pending payments...\n');
        const result = await paymentStatusChecker.checkPendingPayments();
        console.log('Result:', JSON.stringify(result, null, 2));
        break;

      case 'inquiry':
        if (!txnId) {
          console.error('❌ Transaction ID required for inquiry');
          console.log('Usage: node test-payment-checker.js inquiry <transaction_id>');
          process.exit(1);
        }
        console.log(`🔍 Checking transaction: ${txnId}\n`);
        const inquiryResult = await dragonpayService.inquireTransaction(txnId);
        console.log('Inquiry Result:', JSON.stringify(inquiryResult, null, 2));
        break;

      case 'status':
        console.log('📊 Getting service status...\n');
        const status = paymentStatusChecker.getStatus();
        console.log('Service Status:', JSON.stringify(status, null, 2));
        break;

      case 'test-connection':
        console.log('🌐 Testing Dragonpay API connection...\n');
        
        // Test with a dummy transaction ID
        const testTxnId = 'test_' + Date.now();
        console.log(`Testing with dummy transaction ID: ${testTxnId}`);
        
        const testResult = await dragonpayService.inquireTransaction(testTxnId);
        console.log('Test Result:', JSON.stringify(testResult, null, 2));
        
        if (testResult.status !== 'ERROR') {
          console.log('✅ Connection successful - Dragonpay API is reachable');
        } else {
          console.log('❌ Connection failed - Check your network and credentials');
        }
        break;

      default:
        console.log('Available actions:');
        console.log('  check-pending    - Check all pending payments');
        console.log('  inquiry <txnId>  - Check specific transaction');
        console.log('  status          - Get service status');
        console.log('  test-connection - Test Dragonpay API connection');
        console.log('\nExample:');
        console.log('  node test-payment-checker.js check-pending');
        console.log('  node test-payment-checker.js inquiry order_123_1234567890');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Test completed');
  process.exit(0);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

main(); 