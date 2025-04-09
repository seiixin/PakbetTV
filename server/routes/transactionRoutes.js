const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

router.post('/orders', transactionController.createOrder);
router.get('/orders/all', transactionController.getAllOrders);
router.get('/orders/user/:userId', transactionController.getUserOrders);
router.get('/orders/:id', transactionController.getOrderById);
router.put('/orders/:id/status', transactionController.updateOrderStatus);
router.post('/payment', transactionController.processPayment);
router.get('/dragonpay-callback', transactionController.dragonpayCallback);
router.post('/dragonpay-callback', transactionController.dragonpayCallback);
router.get('/verify', transactionController.verifyTransaction);

module.exports = router; 