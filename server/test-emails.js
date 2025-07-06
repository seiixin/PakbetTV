require('dotenv').config();
const {
  sendOrderConfirmationEmail,
  sendTestEmail,
  sendContactFormEmail,
  sendPasswordResetEmail,
  sendOrderDispatchedEmail,
  sendReviewRequestEmail
} = require('./services/emailService');

// Test email recipient - CHANGE THIS TO YOUR EMAIL
const TEST_EMAIL = 'carlkelvinmanahan123@gmail.com';

// Sample product data without images
const sampleProducts = [
  {
    product_id: 1,
    name: "Lucky Bamboo Plant",
    quantity: 2,
    price: 250.00
  },
  {
    product_id: 2,
    name: "Crystal Ball",
    quantity: 1,
    price: 599.00
  }
];

// Test Order Confirmation Email
async function testOrderConfirmation() {
  console.log('\nTesting Order Confirmation Email...');
  const orderDetails = {
    orderNumber: "TEST123",
    customerName: "John Doe",
    customerEmail: TEST_EMAIL,
    customerPhone: "+63 912 345 6789",
    items: sampleProducts,
    totalAmount: 1099.00,
    shippingFee: 150.00,
    discount: 50.00,
    shippingAddress: "123 Test Street, Makati City, Metro Manila, Philippines, 1234",
    paymentMethod: "DragonPay",
    paymentReference: "DP123456789",
    trackingNumber: "TRACK123456789"
  };

  const result = await sendOrderConfirmationEmail(orderDetails);
  console.log('Order Confirmation Email Result:', result);
}

// Test Contact Form Email
async function testContactForm() {
  console.log('\nTesting Contact Form Email...');
  const contactDetails = {
    name: "Jane Smith",
    email: TEST_EMAIL,
    phone: "+63 917 123 4567",
    message: "Hello,\n\nI'm interested in your Feng Shui consultation services.\nCan you please provide more information?\n\nThank you!"
  };

  const result = await sendContactFormEmail(contactDetails);
  console.log('Contact Form Email Result:', result);
}

// Test Password Reset Email
async function testPasswordReset() {
  console.log('\nTesting Password Reset Email...');
  const result = await sendPasswordResetEmail(
    TEST_EMAIL,
    'sample-reset-token-123',
    'http://localhost:3000'
  );
  console.log('Password Reset Email Result:', result);
}

// Test Order Dispatched Email
async function testOrderDispatched() {
  console.log('\nTesting Order Dispatched Email...');
  const dispatchDetails = {
    customerName: "John Doe",
    customerEmail: TEST_EMAIL,
    trackingNumber: "NINJAVAN123456789"
  };

  const result = await sendOrderDispatchedEmail(dispatchDetails);
  console.log('Order Dispatched Email Result:', result);
}

// Test Review Request Email
async function testReviewRequest() {
  console.log('\nTesting Review Request Email...');
  const reviewDetails = {
    orderNumber: "TEST123",
    customerName: "John Doe",
    customerEmail: TEST_EMAIL,
    items: sampleProducts
  };

  const result = await sendReviewRequestEmail(reviewDetails);
  console.log('Review Request Email Result:', result);
}

// Run all tests
async function runAllTests() {
  try {
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