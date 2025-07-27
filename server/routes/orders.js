const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, admin, requireVerification } = require('../middleware/auth');
const ordersController = require('../controllers/ordersController');

router.post('/', [
    auth,
    requireVerification,
    body('address', 'Shipping address is required').notEmpty(),
    body('payment_method', 'Payment method is required').isIn(['credit_card', 'paypal', 'bank_transfer', 'cod', 'dragonpay']),
    body('shipping_details.phone', 'Valid Philippine phone number is required')
        .notEmpty()
        .matches(/^(\+63|0)[0-9]{10}$/)
        .withMessage('Phone number must be in Philippine format (e.g., +639123456789 or 09123456789)')
], ordersController.createOrder);

router.get('/', auth, requireVerification, ordersController.getOrders);
router.get('/:id', auth, requireVerification, ordersController.getOrderById);
router.put('/:id', [auth, admin], ordersController.updateOrder);
router.delete('/:id', auth, requireVerification, ordersController.deleteOrder);
router.get('/check/:productId', auth, requireVerification, ordersController.checkProductPurchase);

// Auto-completion endpoint for cron job
router.post('/auto-complete', [auth, admin], ordersController.autoCompleteOrders);

router.put('/:id/mark-received', auth, requireVerification, ordersController.markOrderReceived);

module.exports = router; 