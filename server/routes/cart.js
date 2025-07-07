const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

router.get('/', auth, cartController.getCart);

router.post('/', [
  auth,
  body('product_id', 'Product ID is required').isNumeric(),
  body('quantity', 'Quantity must be a positive number').isInt({ min: 1 })
], cartController.addToCart);

router.put('/:id', [
  auth,
  body('quantity', 'Quantity must be a positive number').isInt({ min: 1 })
], cartController.updateCartItem);

router.delete('/:id', auth, cartController.deleteCartItem);
router.delete('/', auth, cartController.clearCart);

module.exports = router; 