const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth, admin } = require('../middleware/auth');

// @route   POST api/orders
// @desc    Create a new order from cart
// @access  Private
router.post(
  '/',
  [
    auth,
    body('address', 'Shipping address is required').notEmpty(),
    body('payment_method', 'Payment method is required').isIn(['credit_card', 'paypal', 'bank_transfer', 'cod'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get a database connection for transaction
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const userId = req.user.user.id;
      const { address, payment_method } = req.body;

      // Get cart items with variant information
      const [cartItems] = await connection.query(`
        SELECT c.product_id, c.quantity, c.variant_id, p.name, 
               COALESCE(
                 (SELECT price FROM product_variants WHERE variant_id = c.variant_id),
                 (SELECT MIN(price) FROM product_variants WHERE product_id = c.product_id)
               ) AS price,
               (SELECT size FROM product_variants WHERE variant_id = c.variant_id) AS size,
               (SELECT color FROM product_variants WHERE variant_id = c.variant_id) AS color,
               (SELECT sku FROM product_variants WHERE variant_id = c.variant_id) AS sku
        FROM cart c
        JOIN products p ON c.product_id = p.product_id
        WHERE c.user_id = ?
      `, [userId]);

      if (cartItems.length === 0) {
        await connection.rollback();
        return res.status(400).json({ message: 'Cart is empty' });
      }

      // Calculate total price
      let totalPrice = 0;
      cartItems.forEach(item => {
        totalPrice += parseFloat(item.price) * item.quantity;
      });

      // Create order
      const [orderResult] = await connection.query(
        'INSERT INTO orders (user_id, total_price, order_status) VALUES (?, ?, ?)',
        [userId, totalPrice, 'pending']
      );
      const orderId = orderResult.insertId;

      // Create order items with variant information
      for (const item of cartItems) {
        // Insert order item with variant_id if available
        await connection.query(
          'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, size, color, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            orderId, 
            item.product_id, 
            item.variant_id || null, 
            item.quantity, 
            item.price, 
            item.size || null, 
            item.color || null, 
            item.sku || null
          ]
        );

        // Update product stock based on variant if available
        if (item.variant_id) {
          // Get current stock for this variant
          const [variantStock] = await connection.query(
            'SELECT stock FROM product_variants WHERE variant_id = ?',
            [item.variant_id]
          );
          
          if (variantStock.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: `Variant not found for ${item.name}` });
          }
          
          const newStock = variantStock[0].stock - item.quantity;
          
          if (newStock < 0) {
            await connection.rollback();
            return res.status(400).json({ message: `Not enough stock for ${item.name} ${item.size || ''} ${item.color || ''}` });
          }
          
          await connection.query(
            'UPDATE product_variants SET stock = ? WHERE variant_id = ?',
            [newStock, item.variant_id]
          );
          
          // Record inventory change
          await connection.query(
            'INSERT INTO inventory (variant_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)',
            [item.variant_id, 'remove', item.quantity, `Order ${orderId}`]
          );
        } else {
          // If no variant_id, use the first variant for this product
          const [variants] = await connection.query(
            'SELECT variant_id, stock FROM product_variants WHERE product_id = ? ORDER BY stock DESC LIMIT 1',
            [item.product_id]
          );
          
          if (variants.length > 0) {
            const variantId = variants[0].variant_id;
            const newStock = variants[0].stock - item.quantity;
            
            if (newStock < 0) {
              await connection.rollback();
              return res.status(400).json({ message: `Not enough stock for ${item.name}` });
            }
            
            await connection.query(
              'UPDATE product_variants SET stock = ? WHERE variant_id = ?',
              [newStock, variantId]
            );
            
            // Record inventory change
            await connection.query(
              'INSERT INTO inventory (variant_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)',
              [variantId, 'remove', item.quantity, `Order ${orderId}`]
            );
          }
        }
      }

      // Create shipping record
      await connection.query(
        'INSERT INTO shipping (order_id, user_id, address, status) VALUES (?, ?, ?, ?)',
        [orderId, userId, address, 'pending']
      );

      // Create payment record
      await connection.query(
        'INSERT INTO payments (order_id, user_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?)',
        [orderId, userId, totalPrice, payment_method, 'pending']
      );

      // Clear cart
      await connection.query('DELETE FROM cart WHERE user_id = ?', [userId]);

      await connection.commit();

      res.status(201).json({
        message: 'Order created successfully',
        order: {
          order_id: orderId,
          total_price: totalPrice,
          items: cartItems
        }
      });
    } catch (err) {
      await connection.rollback();
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    } finally {
      connection.release();
    }
  }
);

// @route   GET api/orders
// @desc    Get user's orders
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.user.id;
    const isAdmin = req.user.user.userType === 'admin';
    
    let query = `
      SELECT o.order_id, o.user_id, o.total_price, o.order_status, o.created_at, o.updated_at,
             u.first_name, u.last_name, u.email,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) AS item_count,
             (SELECT status FROM payments WHERE order_id = o.order_id LIMIT 1) AS payment_status,
             (SELECT status FROM shipping WHERE order_id = o.order_id LIMIT 1) AS shipping_status
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
    `;
    
    const params = [];
    
    // Filter by user_id if not admin
    if (!isAdmin) {
      query += ' WHERE o.user_id = ?';
      params.push(userId);
    }
    
    // Add sorting
    query += ' ORDER BY o.created_at DESC';
    
    const [orders] = await db.query(query, params);
    
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.user.id;
    const isAdmin = req.user.user.userType === 'admin';
    
    // Get order details
    let query = `
      SELECT o.*, u.first_name, u.last_name, u.email, u.phone
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      WHERE o.order_id = ?
    `;
    
    // Add user check if not admin
    if (!isAdmin) {
      query += ' AND o.user_id = ?';
    }
    
    const params = [orderId];
    if (!isAdmin) {
      params.push(userId);
    }
    
    const [orders] = await db.query(query, params);
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = orders[0];
    
    // Get order items with variant information
    const [items] = await db.query(`
      SELECT oi.*, p.name AS product_name, p.product_code,
             COALESCE(
               (SELECT image_url FROM product_variants WHERE variant_id = oi.variant_id),
               (SELECT image_url FROM product_variants WHERE product_id = oi.product_id LIMIT 1)
             ) AS image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_id = ?
    `, [orderId]);
    
    // Get shipping info
    const [shipping] = await db.query('SELECT * FROM shipping WHERE order_id = ?', [orderId]);
    
    // Get payment info
    const [payments] = await db.query('SELECT * FROM payments WHERE order_id = ?', [orderId]);
    
    res.json({
      ...order,
      items,
      shipping: shipping.length > 0 ? shipping[0] : null,
      payment: payments.length > 0 ? payments[0] : null
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT api/orders/:id
// @desc    Update order status
// @access  Private/Admin
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const orderId = req.params.id;
    const { order_status, payment_status, shipping_status, tracking_number } = req.body;
    
    // Check if order exists
    const [orders] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Update order status if provided
    if (order_status) {
      if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(order_status)) {
        return res.status(400).json({ message: 'Invalid order status' });
      }
      
      await db.query('UPDATE orders SET order_status = ?, updated_at = NOW() WHERE order_id = ?', [order_status, orderId]);
    }
    
    // Update payment status if provided
    if (payment_status) {
      if (!['pending', 'completed', 'failed', 'refunded'].includes(payment_status)) {
        return res.status(400).json({ message: 'Invalid payment status' });
      }
      
      await db.query('UPDATE payments SET status = ?, updated_at = NOW() WHERE order_id = ?', [payment_status, orderId]);
    }
    
    // Update shipping status and tracking number if provided
    if (shipping_status || tracking_number) {
      let updates = {};
      
      if (shipping_status) {
        if (!['pending', 'shipped', 'delivered'].includes(shipping_status)) {
          return res.status(400).json({ message: 'Invalid shipping status' });
        }
        updates.status = shipping_status;
      }
      
      if (tracking_number) {
        updates.tracking_number = tracking_number;
      }
      
      // Create SQL query with dynamic fields
      let sql = 'UPDATE shipping SET ';
      const values = [];
      
      Object.keys(updates).forEach((key, index) => {
        sql += `${key} = ?`;
        if (index < Object.keys(updates).length - 1) {
          sql += ', ';
        }
        values.push(updates[key]);
      });
      
      sql += ', updated_at = NOW() WHERE order_id = ?';
      values.push(orderId);
      
      await db.query(sql, values);
    }
    
    res.json({ message: 'Order updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE api/orders/:id
// @desc    Cancel order
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const orderId = req.params.id;
    const userId = req.user.user.id;
    const isAdmin = req.user.user.userType === 'admin';
    
    // Check if order exists and belongs to user (or is admin)
    let query = 'SELECT * FROM orders WHERE order_id = ?';
    const params = [orderId];
    
    if (!isAdmin) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    const [orders] = await connection.query(query, params);
    
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = orders[0];
    
    // Only allow cancellation if order is pending or processing
    if (order.order_status !== 'pending' && order.order_status !== 'processing') {
      await connection.rollback();
      return res.status(400).json({ message: 'Only pending or processing orders can be cancelled' });
    }
    
    // Get order items
    const [items] = await connection.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    
    // Restore stock for each item
    for (const item of items) {
      const [variants] = await connection.query(
        'SELECT variant_id, stock FROM product_variants WHERE product_id = ? ORDER BY variant_id ASC LIMIT 1',
        [item.product_id]
      );
      
      if (variants.length > 0) {
        const variantId = variants[0].variant_id;
        const newStock = variants[0].stock + item.quantity;
        
        await connection.query(
          'UPDATE product_variants SET stock = ? WHERE variant_id = ?',
          [newStock, variantId]
        );
        
        // Record inventory change
        await connection.query(
          'INSERT INTO inventory (variant_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)',
          [variantId, 'add', item.quantity, `Order ${orderId} cancelled`]
        );
      }
    }
    
    // Update order status to cancelled
    await connection.query(
      'UPDATE orders SET order_status = ?, updated_at = NOW() WHERE order_id = ?',
      ['cancelled', orderId]
    );
    
    // Update payment status to refunded if it was completed
    await connection.query(
      'UPDATE payments SET status = ?, updated_at = NOW() WHERE order_id = ? AND status = ?',
      ['refunded', orderId, 'completed']
    );
    
    await connection.commit();
    
    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    await connection.rollback();
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
});

// @route   PUT api/orders/:id/payment
// @desc    Update payment status
// @access  Private/Admin
router.put('/:id/payment', [auth, admin], async (req, res) => {
  // ... (existing payment update logic) ...
});

// @route   PUT api/orders/:id/shipping
// @desc    Update shipping status and tracking number
// @access  Private/Admin
router.put('/:id/shipping', [auth, admin], async (req, res) => {
  // ... (existing shipping update logic) ...
});

// --- NEW ROUTE --- 
// @route   GET api/orders/check/:productId
// @desc    Check if the authenticated user has purchased a specific product
// @access  Private
router.get('/check/:productId', auth, async (req, res) => {
  try {
    const userId = req.user.user.id; // Get user ID from auth middleware
    const productId = req.params.productId;

    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }
    if (!productId || isNaN(parseInt(productId))) { // Basic validation for productId
        return res.status(400).json({ message: 'Invalid product ID' });
    }

    // Query to find if there's a completed order by this user containing this product
    const query = `
      SELECT COUNT(*) AS purchase_count
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.user_id = ? 
        AND oi.product_id = ?
        AND o.order_status = 'processing' -- Check for 'processing' status set by postback on success
    `;
    
    const [results] = await db.query(query, [userId, parseInt(productId)]);
    
    const hasPurchased = results[0].purchase_count > 0;
    
    res.json({ hasPurchased });

  } catch (err) {
    console.error("Error checking purchase status:", err);
    // Avoid sending detailed error messages to the client in production
    res.status(500).json({ message: 'Server error checking purchase status' });
  }
});

module.exports = router; 