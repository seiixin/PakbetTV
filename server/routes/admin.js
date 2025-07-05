const express = require('express');
const router = express.Router();
const { auth, admin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// Global route to manually trigger Dragonpay Transaction Status Query check
router.get('/check-payments', adminController.checkPayments);

// Alternative route without authentication for easier global access
router.get('/payments/check', adminController.paymentsCheck);

// Combine the payment confirmation and shipping order creation
router.post('/confirm-payment/:orderId', adminController.confirmPayment);

// Create shipping order manually
router.post('/create-shipping/:orderId', adminController.createShipping);

module.exports = router; 