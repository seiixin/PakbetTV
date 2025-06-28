const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { sendOrderConfirmationEmail, sendContactFormEmail } = require('../services/emailService');

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

// Contact form submission endpoint
router.post('/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;

  // Validate required fields
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and message are required fields'
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }

  try {
    const result = await sendContactFormEmail({
      name,
      email,
      phone: phone || 'Not provided',
      message
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Your message has been sent successfully! We will get back to you soon.'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send message. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Error processing contact form:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while sending your message. Please try again later.'
    });
  }
});

module.exports = router; 