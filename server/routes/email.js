const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../services/emailService');

// Test email endpoint
router.post('/test', async (req, res) => {
  const { recipientEmail } = req.body;

  if (!recipientEmail) {
    return res.status(400).json({ 
      success: false, 
      message: 'Recipient email is required' 
    });
  }

  try {
    // Create sample test data
    const testOrderDetails = {
      orderNumber: 'TEST-123',
      customerName: 'Test Customer',
      customerEmail: recipientEmail,
      customerPhone: '+1234567890',
      items: [
        {
          name: 'Lucky Bamboo Plant',
          quantity: 2,
          price: 29.99
        },
        {
          name: 'Crystal Ball',
          quantity: 1,
          price: 49.99
        }
      ],
      totalAmount: 109.97,
      shippingFee: 10.00,
      shippingAddress: '123 Test Street, Test City, Test Country 12345',
      paymentMethod: 'Credit Card',
      paymentReference: 'TEST-PAY-123',
      trackingNumber: 'TEST-TRACK-123'
    };

    const result = await sendOrderConfirmationEmail(testOrderDetails);
    return res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return res.status(500).json({
      success: false,
      message: 'Error sending test email',
      error: error.message
    });
  }
});

// Actual order confirmation email endpoint
router.post('/order-confirmation', auth, async (req, res) => {
  const {
    orderNumber,
    customerName,
    customerEmail,
    customerPhone,
    items,
    totalAmount,
    shippingFee,
    shippingAddress,
    paymentMethod,
    paymentReference,
    trackingNumber
  } = req.body;

  // Validate required fields
  if (!orderNumber || !customerEmail || !items || !totalAmount) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  try {
    const result = await sendOrderConfirmationEmail({
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      items,
      totalAmount,
      shippingFee,
      shippingAddress,
      paymentMethod,
      paymentReference,
      trackingNumber
    });

    return res.status(200).json({
      success: true,
      message: 'Order confirmation email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return res.status(500).json({
      success: false,
      message: 'Error sending order confirmation email',
      error: error.message
    });
  }
});

module.exports = router; 