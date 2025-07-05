const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, admin } = require('../middleware/auth');
const ordersController = require('../controllers/ordersController');

router.post('/', [
    auth,
    body('address', 'Shipping address is required').notEmpty(),
    body('payment_method', 'Payment method is required').isIn(['credit_card', 'paypal', 'bank_transfer', 'cod', 'dragonpay'])
], ordersController.createOrder);

router.get('/', auth, ordersController.getOrders);
router.get('/:id', auth, ordersController.getOrderById);
router.put('/:id', [auth, admin], ordersController.updateOrder);
router.delete('/:id', auth, ordersController.deleteOrder);
router.get('/check/:productId', auth, ordersController.checkProductPurchase);

// Auto-completion endpoint for cron job
router.post('/auto-complete', [auth, admin], ordersController.autoCompleteOrders);

module.exports = router; 