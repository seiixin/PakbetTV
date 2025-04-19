const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// @route   GET api/cart
// @desc    Get user's cart items
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.user.id;

    // Get cart items with product details
    const [cartItems] = await db.query(`
      SELECT c.cart_id, c.user_id, c.product_id, c.quantity, c.created_at, c.updated_at,
             p.name AS product_name, p.product_code, p.description,
             (SELECT MIN(price) FROM product_variants WHERE product_id = p.product_id) AS min_price,
             (SELECT MAX(price) FROM product_variants WHERE product_id = p.product_id) AS max_price,
             (SELECT image_url FROM product_variants WHERE product_id = p.product_id LIMIT 1) AS image_url
      FROM cart c
      JOIN products p ON c.product_id = p.product_id
      WHERE c.user_id = ?
    `, [userId]);

    res.json(cartItems);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/cart
// @desc    Add item to cart
// @access  Private
router.post(
  '/',
  [
    auth,
    body('product_id', 'Product ID is required').isNumeric(),
    body('quantity', 'Quantity must be a positive number').isInt({ min: 1 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user.user.id;
      const { product_id, quantity } = req.body;

      // Check if product exists
      const [products] = await db.query('SELECT * FROM products WHERE product_id = ?', [product_id]);
      if (products.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check if product has at least one variant with stock
      const [variants] = await db.query('SELECT SUM(stock) AS total_stock FROM product_variants WHERE product_id = ?', [product_id]);
      if (!variants[0].total_stock || variants[0].total_stock < quantity) {
        return res.status(400).json({ message: 'Not enough stock available' });
      }

      // Check if item is already in cart
      const [existingItems] = await db.query(
        'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
        [userId, product_id]
      );

      if (existingItems.length > 0) {
        // Update quantity if item already exists
        const newQuantity = existingItems[0].quantity + quantity;
        
        // Ensure new quantity doesn't exceed available stock
        if (newQuantity > variants[0].total_stock) {
          return res.status(400).json({ message: 'Not enough stock available for the requested quantity' });
        }
        
        await db.query(
          'UPDATE cart SET quantity = ?, updated_at = NOW() WHERE cart_id = ?',
          [newQuantity, existingItems[0].cart_id]
        );

        return res.json({
          message: 'Cart updated successfully',
          item: {
            cart_id: existingItems[0].cart_id,
            product_id,
            quantity: newQuantity
          }
        });
      }

      // Add new item to cart
      const [result] = await db.query(
        'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [userId, product_id, quantity]
      );

      res.status(201).json({
        message: 'Item added to cart',
        item: {
          cart_id: result.insertId,
          user_id: userId,
          product_id,
          quantity
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT api/cart/:id
// @desc    Update cart item quantity
// @access  Private
router.put(
  '/:id',
  [
    auth,
    body('quantity', 'Quantity must be a positive number').isInt({ min: 1 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const cartId = req.params.id;
      const userId = req.user.user.id;
      const { quantity } = req.body;

      // Check if cart item exists and belongs to user
      const [cartItems] = await db.query(
        'SELECT c.*, (SELECT SUM(stock) FROM product_variants WHERE product_id = c.product_id) AS available_stock FROM cart c WHERE c.cart_id = ? AND c.user_id = ?',
        [cartId, userId]
      );

      if (cartItems.length === 0) {
        return res.status(404).json({ message: 'Cart item not found' });
      }

      // Check stock availability
      if (quantity > cartItems[0].available_stock) {
        return res.status(400).json({ message: 'Not enough stock available' });
      }

      // Update cart item
      await db.query(
        'UPDATE cart SET quantity = ?, updated_at = NOW() WHERE cart_id = ?',
        [quantity, cartId]
      );

      res.json({
        message: 'Cart updated successfully',
        item: {
          cart_id: cartId,
          quantity
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   DELETE api/cart/:id
// @desc    Remove item from cart
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const cartId = req.params.id;
    const userId = req.user.user.id;

    // Delete cart item if it belongs to user
    const [result] = await db.query(
      'DELETE FROM cart WHERE cart_id = ? AND user_id = ?',
      [cartId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    res.json({ message: 'Item removed from cart' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE api/cart
// @desc    Clear user's cart
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    const userId = req.user.user.id;

    // Delete all cart items for user
    await db.query('DELETE FROM cart WHERE user_id = ?', [userId]);

    res.json({ message: 'Cart cleared successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 