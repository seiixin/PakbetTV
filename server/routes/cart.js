const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, requireVerification } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

router.get('/', auth, requireVerification, cartController.getCart);

router.post('/', [
  auth,
  requireVerification,
  body('product_id', 'Product ID is required').isNumeric(),
  body('quantity', 'Quantity must be a positive number').isInt({ min: 1 })
], cartController.addToCart);

router.put('/:id', [
  auth,
  requireVerification,
  body('quantity', 'Quantity must be a positive number').isInt({ min: 1 })
], cartController.updateCartItem);

router.delete('/:id', auth, requireVerification, cartController.deleteCartItem);
router.delete('/', auth, requireVerification, cartController.clearCart);

module.exports = router; 