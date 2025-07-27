const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const transactionsController = require('../controllers/transactionsController');

// Main transaction routes - using unified controller that supports both voucher and promotion systems
router.post('/orders', auth, transactionsController.createOrder);
router.post('/payment', auth, transactionsController.processPayment);
router.get('/verify', transactionsController.verifyPayment);
router.post('/postback', transactionsController.handlePostback);

// Payment continuation route for "Continue Payment" functionality
router.get('/payment-url/:orderId', auth, transactionsController.getPaymentUrl);

// Utility routes
router.post('/simulate-payment', transactionsController.simulatePayment);
router.post('/prepare-for-confirmation', transactionsController.prepareForConfirmation);
router.post('/test-postback', transactionsController.testPostback);
router.get('/test-postback', transactionsController.testGetPostback);

// Payment status checker routes
router.post('/check-payment-status', transactionsController.checkPaymentStatus);
router.post('/trigger-payment-check', transactionsController.triggerPaymentCheck);
router.get('/payment-checker-status', transactionsController.getPaymentCheckerStatus);
router.get('/inquiry/:txnId', transactionsController.inquireTransaction);
router.get('/pending-payments', transactionsController.getPendingPayments);

module.exports = router; 