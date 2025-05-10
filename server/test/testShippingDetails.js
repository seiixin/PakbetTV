/**
 * Test Script for Shipping Details Implementation
 * 
 * This script tests the shipping details functionality by:
 * 1. Creating a test order with both string and structured address formats
 * 2. Testing the migration of existing shipping addresses
 * 3. Testing the NinjaVan delivery order creation
 * 4. Simulating webhook events
 */

const db = require('../config/db');
const enhancedDeliveryService = require('../services/enhancedDeliveryService');
const { runMigration } = require('../database/run_shipping_migration');
const axios = require('axios');

const TEST_USER_ID = 13; // Felix Juaton's user ID

// Test creating an order with string address
async function testStringAddress() {
  console.log('=== Testing order creation with string address ===');
  
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Create test order
    const stringAddress = '123 Test Street, Quezon City, 12345, Metro Manila';
    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total_price, order_status, payment_status) VALUES (?, ?, ?, ?)',
      [TEST_USER_ID, 100.00, 'pending', 'pending']
    );
    
    const orderId = orderResult.insertId;
    console.log(`Created test order with ID: ${orderId}`);
    
    // Add test item
    await connection.query(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
      [orderId, 71, 1, 100.00]
    );
    
    // Create shipping entry with string address
    await connection.query(
      'INSERT INTO shipping (order_id, user_id, address, status) VALUES (?, ?, ?, ?)',
      [orderId, TEST_USER_ID, stringAddress, 'pending']
    );
    
    // Check if shipping_details was created by trigger
    const [shippingDetails] = await connection.query(
      'SELECT * FROM shipping_details WHERE order_id = ?',
      [orderId]
    );
    
    if (shippingDetails.length > 0) {
      console.log('✅ Trigger successfully created shipping_details record');
      console.log('Shipping details:', shippingDetails[0]);
    } else {
      console.log('❌ Trigger failed to create shipping_details record');
    }
    
    await connection.commit();
    return orderId;
  } catch (error) {
    await connection.rollback();
    console.error('Error in testStringAddress:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Test creating an order with structured address
async function testStructuredAddress() {
  console.log('\n=== Testing order creation with structured address ===');
  
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Create test order
    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total_price, order_status, payment_status) VALUES (?, ?, ?, ?)',
      [TEST_USER_ID, 200.00, 'pending', 'pending']
    );
    
    const orderId = orderResult.insertId;
    console.log(`Created test order with ID: ${orderId}`);
    
    // Add test item
    await connection.query(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
      [orderId, 71, 2, 100.00]
    );
    
    // Create shipping entry with string address
    const stringAddress = '456 Sample Road, Manila, 54321, Metro Manila';
    await connection.query(
      'INSERT INTO shipping (order_id, user_id, address, status) VALUES (?, ?, ?, ?)',
      [orderId, TEST_USER_ID, stringAddress, 'pending']
    );
    
    // Create structured shipping details directly
    await connection.query(
      'INSERT INTO shipping_details (order_id, address1, city, state, postcode, country) VALUES (?, ?, ?, ?, ?, ?)',
      [orderId, '456 Sample Road', 'Manila', 'Metro Manila', '54321', 'PH']
    );
    
    // Verify both records exist
    const [shipping] = await connection.query(
      'SELECT * FROM shipping WHERE order_id = ?',
      [orderId]
    );
    
    const [shippingDetails] = await connection.query(
      'SELECT * FROM shipping_details WHERE order_id = ?',
      [orderId]
    );
    
    if (shipping.length > 0 && shippingDetails.length > 0) {
      console.log('✅ Successfully created both shipping and shipping_details records');
      console.log('Shipping details:', shippingDetails[0]);
    } else {
      console.log('❌ Failed to create both records');
    }
    
    await connection.commit();
    return orderId;
  } catch (error) {
    await connection.rollback();
    console.error('Error in testStructuredAddress:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Test creating NinjaVan delivery
async function testCreateDelivery(orderId) {
  console.log(`\n=== Testing NinjaVan delivery creation for order ${orderId} ===`);
  
  try {
    // Get structured shipping address
    const shippingAddress = await enhancedDeliveryService.getStructuredShippingAddress(orderId);
    console.log('Structured shipping address:', shippingAddress);
    
    // Create delivery (comment out if you don't want to make actual API calls)
    /*
    const deliveryResult = await enhancedDeliveryService.createDeliveryWithStructuredData(orderId);
    console.log('Delivery created successfully:', deliveryResult);
    */
    
    return true;
  } catch (error) {
    console.error('Error in testCreateDelivery:', error);
    return false;
  }
}

// Test simulating webhook
async function testWebhook(orderId) {
  console.log(`\n=== Testing webhook simulation for order ${orderId} ===`);
  
  try {
    // Create fake tracking number
    const tracking_number = `TEST-${orderId}-${Date.now()}`;
    
    // Update shipping record with tracking number
    await db.query(
      'UPDATE shipping SET tracking_number = ? WHERE order_id = ?',
      [tracking_number, orderId]
    );
    
    // Simulate webhook events
    const events = [
      { event_type: 'order.created', description: 'Order has been created' },
      { event_type: 'order.picked_up', description: 'Order has been picked up' },
      { event_type: 'order.out_for_delivery', description: 'Order is out for delivery' },
      { event_type: 'order.delivered', description: 'Order has been delivered' }
    ];
    
    for (const event of events) {
      const payload = {
        ...event,
        tracking_number,
        timestamp: new Date().toISOString()
      };
      
      console.log(`Simulating "${event.event_type}" event`);
      await enhancedDeliveryService.processWebhook(payload);
    }
    
    // Check tracking events
    const [trackingEvents] = await db.query(
      'SELECT * FROM tracking_events WHERE tracking_number = ? ORDER BY created_at',
      [tracking_number]
    );
    
    console.log(`✅ Recorded ${trackingEvents.length} tracking events`);
    
    // Check if order status was updated
    const [[order]] = await db.query(
      'SELECT order_status FROM orders WHERE order_id = ?',
      [orderId]
    );
    
    console.log(`Order status updated to: ${order.order_status}`);
    
    return true;
  } catch (error) {
    console.error('Error in testWebhook:', error);
    return false;
  }
}

// Test HTTP webhook endpoint
async function testWebhookEndpoint(orderId) {
  console.log(`\n=== Testing webhook HTTP endpoint for order ${orderId} ===`);
  
  try {
    // Get tracking number
    const [[shipping]] = await db.query(
      'SELECT tracking_number FROM shipping WHERE order_id = ?',
      [orderId]
    );
    
    if (!shipping || !shipping.tracking_number) {
      console.log('❌ No tracking number found for this order');
      return false;
    }
    
    // Make HTTP request to test webhook endpoint
    const response = await axios.post('http://localhost:5000/api/webhooks/test/ninjavan', {
      tracking_number: shipping.tracking_number,
      event_type: 'order.update',
      order_id: orderId
    });
    
    console.log('Webhook endpoint response:', response.data);
    return true;
  } catch (error) {
    console.error('Error in testWebhookEndpoint:', error.response?.data || error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  try {
    console.log('Starting shipping details implementation tests...\n');
    
    // Run database migration first
    console.log('Running database migration...');
    await runMigration();
    
    // Test string address
    const stringOrderId = await testStringAddress();
    
    // Test structured address
    const structuredOrderId = await testStructuredAddress();
    
    // Test delivery creation
    await testCreateDelivery(stringOrderId);
    await testCreateDelivery(structuredOrderId);
    
    // Test webhooks
    await testWebhook(stringOrderId);
    
    // Test webhook endpoint
    await testWebhookEndpoint(structuredOrderId);
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the tests
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testStringAddress,
  testStructuredAddress,
  testCreateDelivery,
  testWebhook,
  testWebhookEndpoint,
  runAllTests
}; 