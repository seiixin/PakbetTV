const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
router.get('/', auth, async (req, res) => {
  try {
    // Handle different user token structures
    const userId = req.user?.user?.id || req.user?.id || req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User authentication failed' });
    }

    console.log('Fetching cart for user ID:', userId);

    const [cartItems] = await db.query(`
      SELECT c.cart_id, c.user_id, c.product_id, c.variant_id, c.quantity, c.created_at, c.updated_at,
             p.name AS product_name, p.product_code, p.description,
             COALESCE(
               (SELECT price FROM product_variants WHERE variant_id = c.variant_id),
               (SELECT MIN(price) FROM product_variants WHERE product_id = p.product_id),
               p.price,
               0
             ) AS price,
             COALESCE(
               (SELECT stock FROM product_variants WHERE variant_id = c.variant_id),
               (SELECT SUM(stock) FROM product_variants WHERE product_id = p.product_id),
               p.stock,
               0
             ) AS stock,
             COALESCE(
               (SELECT image_url FROM product_variants WHERE variant_id = c.variant_id),
               (SELECT image_url FROM product_variants WHERE product_id = p.product_id LIMIT 1),
               (SELECT image_url FROM product_images WHERE product_id = p.product_id ORDER BY sort_order LIMIT 1)
             ) AS image_url,
             COALESCE(
               (SELECT JSON_UNQUOTE(JSON_EXTRACT(attributes, '$.Size')) FROM product_variants WHERE variant_id = c.variant_id),
               NULL
             ) AS size,
             COALESCE(
               (SELECT JSON_UNQUOTE(JSON_EXTRACT(attributes, '$.Color')) FROM product_variants WHERE variant_id = c.variant_id),
               NULL
             ) AS color,
             (SELECT sku FROM product_variants WHERE variant_id = c.variant_id) AS sku
      FROM cart c
      JOIN products p ON c.product_id = p.product_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `, [userId]);

    console.log(`Found ${cartItems.length} cart items for user ${userId}`);
    
    // Process cart items to handle images and ensure proper data
    const processedCartItems = cartItems.map(item => {
      // Handle image URL - convert BLOB to base64 if needed
      let processedImageUrl = null;
      if (item.image_url) {
        if (Buffer.isBuffer(item.image_url)) {
          // Convert BLOB to base64
          processedImageUrl = `data:image/jpeg;base64,${item.image_url.toString('base64')}`;
        } else if (typeof item.image_url === 'string') {
          // Use as URL path
          processedImageUrl = item.image_url.startsWith('/') ? item.image_url : `/uploads/${item.image_url}`;
        }
      }
      
      return {
        ...item,
        price: Number(item.price) || 0,
        stock: Number(item.stock) || 0,
        image_url: processedImageUrl || '/placeholder-product.jpg'
      };
    });
    
    res.json(processedCartItems);
  } catch (err) {
    console.error('Cart fetch error:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
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
      // Handle different user token structures
      const userId = req.user?.user?.id || req.user?.id || req.user?.user_id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User authentication failed' });
      }

      const { product_id, quantity, variant_id } = req.body;
      
      console.log('Adding to cart:', { userId, product_id, variant_id, quantity });

      // Check if product exists
      const [products] = await db.query('SELECT * FROM products WHERE product_id = ?', [product_id]);
      if (products.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check if the product has variants
      const [allVariants] = await db.query('SELECT * FROM product_variants WHERE product_id = ?', [product_id]);
      console.log(`Product ${product_id} has ${allVariants.length} variants`);

      // If specific variant is requested, validate it
      if (variant_id) {
        const [variant] = await db.query('SELECT * FROM product_variants WHERE variant_id = ? AND product_id = ?', [variant_id, product_id]);
        if (variant.length === 0) {
          return res.status(404).json({ message: 'Variant not found for this product' });
        }
        console.log(`Variant ${variant_id} has stock: ${variant[0].stock}, requested quantity: ${quantity}`);
        if (variant[0].stock < quantity) {
          return res.status(400).json({ message: 'Not enough stock available for the selected variant' });
        }
      } else if (allVariants.length > 0) {
        // Product has variants but no specific variant selected - check total stock
        const [variants] = await db.query('SELECT SUM(stock) AS total_stock FROM product_variants WHERE product_id = ?', [product_id]);
        console.log(`Total stock for product ${product_id}: ${variants[0]?.total_stock}, requested quantity: ${quantity}`);
        if (!variants[0]?.total_stock || variants[0].total_stock < quantity) {
          return res.status(400).json({ 
            message: 'Not enough stock available',
            debug: `Available stock: ${variants[0]?.total_stock || 0}, requested: ${quantity}`
          });
        }
      } else {
        // Product has no variants - this is allowed, just log it for debugging
        const productStock = products[0].stock || null;
        console.log(`Product ${product_id} has no variants. Product stock: ${productStock}, requested quantity: ${quantity}`);
        
        // If product has stock column and it's set, validate against it
        // Otherwise, allow the item to be added (similar to checkout process)
        if (productStock !== null && productStock < quantity) {
          return res.status(400).json({ 
            message: 'Not enough stock available',
            debug: `Product stock: ${productStock}, requested: ${quantity}. Note: Product has no variants configured.`
          });
        }
        
        // If no stock tracking for products without variants, allow it through
        // This matches the behavior of the checkout process
        if (productStock === null) {
          console.log(`Product ${product_id} has no stock tracking. Allowing cart addition.`);
        }
      }

      // Check for existing cart items
      let existingQuery = 'SELECT * FROM cart WHERE user_id = ? AND product_id = ?';
      let queryParams = [userId, product_id];
      if (variant_id) {
        existingQuery += ' AND variant_id = ?';
        queryParams.push(variant_id);
      } else {
        existingQuery += ' AND variant_id IS NULL';
      }
      
      const [existingItems] = await db.query(existingQuery, queryParams);
      
      if (existingItems.length > 0) {
        // Update existing item
        const newQuantity = existingItems[0].quantity + quantity;
        
        // Validate new quantity against stock
        if (variant_id) {
          const [variant] = await db.query('SELECT stock FROM product_variants WHERE variant_id = ?', [variant_id]);
          if (newQuantity > variant[0].stock) {
            return res.status(400).json({ message: 'Not enough stock available for the requested quantity' });
          }
        } else if (allVariants.length > 0) {
          const [variants] = await db.query('SELECT SUM(stock) AS total_stock FROM product_variants WHERE product_id = ?', [product_id]);
          if (newQuantity > variants[0].total_stock) {
            return res.status(400).json({ message: 'Not enough stock available for the requested quantity' });
          }
        } else {
          // Product has no variants - check product stock if available
          const productStock = products[0].stock || null;
          if (productStock !== null && newQuantity > productStock) {
            return res.status(400).json({ message: 'Not enough stock available for the requested quantity' });
          }
          // If no stock tracking, allow the update
        }
        
        await db.query(
          'UPDATE cart SET quantity = ?, updated_at = NOW() WHERE cart_id = ?',
          [newQuantity, existingItems[0].cart_id]
        );
        
        console.log('Cart item updated successfully');
        return res.json({
          message: 'Cart updated successfully',
          item: {
            cart_id: existingItems[0].cart_id,
            product_id,
            variant_id: variant_id || null,
            quantity: newQuantity
          }
        });
      }

      // Insert new cart item
      const insertQuery = variant_id
        ? 'INSERT INTO cart (user_id, product_id, variant_id, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())'
        : 'INSERT INTO cart (user_id, product_id, quantity, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())';
      const insertParams = variant_id
        ? [userId, product_id, variant_id, quantity]
        : [userId, product_id, quantity];
      const [result] = await db.query(insertQuery, insertParams);
      
      console.log('Cart item added successfully');
      res.status(201).json({
        message: 'Item added to cart',
        item: {
          cart_id: result.insertId,
          user_id: userId,
          product_id,
          variant_id: variant_id || null,
          quantity
        }
      });
    } catch (err) {
      console.error('Cart add error:', err.message);
      console.error('Stack trace:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);
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
      // Handle different user token structures
      const userId = req.user?.user?.id || req.user?.id || req.user?.user_id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User authentication failed' });
      }

      const { quantity } = req.body;

      console.log('Updating cart item:', { cartId, userId, quantity });

      const [cartItems] = await db.query(
        'SELECT c.*, (SELECT SUM(stock) FROM product_variants WHERE product_id = c.product_id) AS available_stock FROM cart c WHERE c.cart_id = ? AND c.user_id = ?',
        [cartId, userId]
      );
      if (cartItems.length === 0) {
        return res.status(404).json({ message: 'Cart item not found' });
      }
      if (quantity > cartItems[0].available_stock) {
        return res.status(400).json({ message: 'Not enough stock available' });
      }
      await db.query(
        'UPDATE cart SET quantity = ?, updated_at = NOW() WHERE cart_id = ?',
        [quantity, cartId]
      );

      console.log('Cart item quantity updated successfully');
      res.json({
        message: 'Cart updated successfully',
        item: {
          cart_id: cartId,
          quantity
        }
      });
    } catch (err) {
      console.error('Cart update error:', err.message);
      console.error('Stack trace:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);
router.delete('/:id', auth, async (req, res) => {
  try {
    const cartId = req.params.id;
    // Handle different user token structures
    const userId = req.user?.user?.id || req.user?.id || req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User authentication failed' });
    }

    console.log('Deleting cart item:', { cartId, userId });

    const [result] = await db.query(
      'DELETE FROM cart WHERE cart_id = ? AND user_id = ?',
      [cartId, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    console.log('Cart item deleted successfully');
    res.json({ message: 'Item removed from cart' });
  } catch (err) {
    console.error('Cart delete error:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
router.delete('/', auth, async (req, res) => {
  try {
    // Handle different user token structures
    const userId = req.user?.user?.id || req.user?.id || req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User authentication failed' });
    }

    console.log('Clearing cart for user:', userId);

    await db.query('DELETE FROM cart WHERE user_id = ?', [userId]);

    console.log('Cart cleared successfully');
    res.json({ message: 'Cart cleared successfully' });
  } catch (err) {
    console.error('Cart clear error:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
module.exports = router; 