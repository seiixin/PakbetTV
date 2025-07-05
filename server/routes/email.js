const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const emailController = require('../controllers/emailController');

// Test email endpoint
router.post('/test', emailController.sendTestEmail);

// Actual order confirmation email endpoint
router.post('/order-confirmation', auth, emailController.sendOrderConfirmation);

// Contact form submission endpoint
router.post('/contact', emailController.sendContactForm);

module.exports = router; 