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

  console.log('Payment Status Checker Test');

  try {
    switch (action) {
      case 'check-pending':
        console.log('Checking all pending payments...');
        const result = await paymentStatusChecker.checkPendingPayments();
        console.log('Result:', result.status || 'done');
        break;

      case 'inquiry':
        if (!txnId) {
          console.error('Transaction ID required for inquiry');
          console.log('Usage: node test-payment-checker.js inquiry <transaction_id>');
          process.exit(1);
        }
        console.log(`Checking transaction: ${txnId}`);
        const inquiryResult = await dragonpayService.inquireTransaction(txnId);
        console.log('Inquiry Result:', inquiryResult.status || 'done');
        break;

      case 'status':
        console.log('Getting service status...');
        const status = paymentStatusChecker.getStatus();
        console.log('Service Status:', status.status || 'done');
        break;

      case 'test-connection':
        console.log('Testing Dragonpay API connection...');
        
        // Test with a dummy transaction ID
        const testTxnId = 'test_' + Date.now();
        console.log(`Testing with dummy transaction ID: ${testTxnId}`);
        
        const testResult = await dragonpayService.inquireTransaction(testTxnId);
        console.log('Test Result:', testResult.status || 'done');
        
        if (testResult.status !== 'ERROR') {
          console.log('Connection successful');
        } else {
          console.log('Connection failed');
        }
        break;

      default:
        console.log('Available actions: check-pending, inquiry <txnId>, status, test-connection');
        console.log('Example: node test-payment-checker.js check-pending');
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }

  console.log('Test completed');
  process.exit(0);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  process.exit(1);
});

main(); 