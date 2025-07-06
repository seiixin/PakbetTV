require('dotenv').config();
const db = require('./config/db');
const {
  sendOrderConfirmationEmail,
  sendTestEmail,
  sendContactFormEmail,
  sendPasswordResetEmail,
  sendOrderDispatchedEmail,
  sendReviewRequestEmail
} = require('./services/emailService');

// Test email recipient - CHANGE THIS TO YOUR EMAIL
const TEST_EMAIL = 'felixjuaton87@gmail.com';

// Sample product data with product_ids for images
const sampleProducts = [
  {
    product_id: 27,
    name: "Lucky Bamboo Plant",
    quantity: 2,
    price: 250.00,
    image_url: null // Will use /products/image/27 endpoint
  },
  {
    product_id: 18,
    name: "Crystal Ball",
    quantity: 1,
    price: 599.00,
    image_url: null // Will use /products/image/18 endpoint
  }
];

// Test database connection
async function testDbConnection() {
  try {
    const connection = await db.getConnection();
    console.log('✓ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
}

// Test Order Confirmation Email
async function testOrderConfirmation() {
  console.log('\nStarting Order Confirmation Email test...');
  try {
    const orderDetails = {
      orderNumber: "TEST123",
      customerName: "John Doe",
      customerEmail: TEST_EMAIL,
      customerPhone: "+63 912 345 6789",
      items: sampleProducts, // Now includes product_ids for images
      totalAmount: 1099.00,
      shippingFee: 150.00,
      discount: 50.00,
      shippingAddress: "123 Test Street, Makati City, Metro Manila, Philippines, 1234",
      paymentMethod: "DragonPay",
      paymentReference: "DP123456789",
      trackingNumber: "TRACK123456789"
    };

    console.log('Sending order confirmation email...');
    const result = await sendOrderConfirmationEmail(orderDetails);
    console.log('Order Confirmation Email Result:', result);
  } catch (error) {
    console.error('Error in testOrderConfirmation:', error);
  }
}

// Test Contact Form Email
async function testContactForm() {
  console.log('\nStarting Contact Form Email test...');
  try {
    const contactDetails = {
      name: "Jane Smith",
      email: TEST_EMAIL,
      phone: "+63 917 123 4567",
      message: "Hello,\n\nI'm interested in your Feng Shui consultation services.\nCan you please provide more information?\n\nThank you!"
    };

    console.log('Sending contact form email...');
    const result = await sendContactFormEmail(contactDetails);
    console.log('Contact Form Email Result:', result);
  } catch (error) {
    console.error('Error in testContactForm:', error);
  }
}

// Test Password Reset Email
async function testPasswordReset() {
  console.log('\nStarting Password Reset Email test...');
  try {
    console.log('Sending password reset email...');
    const result = await sendPasswordResetEmail(
      TEST_EMAIL,
      'sample-reset-token-123',
      'http://localhost:3000'
    );
    console.log('Password Reset Email Result:', result);
  } catch (error) {
    console.error('Error in testPasswordReset:', error);
  }
}

// Test Order Dispatched Email
async function testOrderDispatched() {
  console.log('\nStarting Order Dispatched Email test...');
  try {
    const dispatchDetails = {
      customerName: "John Doe",
      customerEmail: TEST_EMAIL,
      trackingNumber: "NINJAVAN123456789"
    };

    console.log('Sending order dispatched email...');
    const result = await sendOrderDispatchedEmail(dispatchDetails);
    console.log('Order Dispatched Email Result:', result);
  } catch (error) {
    console.error('Error in testOrderDispatched:', error);
  }
}

// Test Review Request Email
async function testReviewRequest() {
  console.log('\nStarting Review Request Email test...');
  try {
    const reviewDetails = {
      orderNumber: "TEST123",
      customerName: "John Doe",
      customerEmail: TEST_EMAIL,
      items: sampleProducts // Now includes product_ids for images
    };

    console.log('Sending review request email...');
    const result = await sendReviewRequestEmail(reviewDetails);
    console.log('Review Request Email Result:', result);
  } catch (error) {
    console.error('Error in testReviewRequest:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting email tests...');
  console.log('Using test email:', TEST_EMAIL);
  console.log('SMTP Config:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ? '✓ Set' : '✗ Missing',
    pass: process.env.SMTP_PASS ? '✓ Set' : '✗ Missing'
  });

  try {
    // Test database connection first
    const dbConnected = await testDbConnection();
    if (!dbConnected) {
      console.error('Cannot proceed with tests - database connection failed');
      process.exit(1);
    }

    await testOrderConfirmation();
    await testContactForm();
    await testPasswordReset();
    await testOrderDispatched();
    await testReviewRequest();
    
    console.log('\nAll test emails completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Check if email is configured
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  // Update TEST_EMAIL before running
  if (TEST_EMAIL === 'your.email@example.com') {
    console.error('\nPlease update TEST_EMAIL in test-emails.js before running tests!');
    process.exit(1);
  }
  
  runAllTests();
} else {
  console.error('\nMissing SMTP configuration! Make sure your .env file is properly configured.');
  process.exit(1);
} 