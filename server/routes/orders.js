const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth, admin } = require('../middleware/auth');
const axios = require('axios');
const config = require('../config/keys');
const API_BASE_URL = config.NINJAVAN_API_URL || 'https://api.ninjavan.co';
const COUNTRY_CODE = config.NINJAVAN_COUNTRY_CODE || 'SG';
const CLIENT_ID = config.NINJAVAN_CLIENT_ID;
const CLIENT_SECRET = config.NINJAVAN_CLIENT_SECRET;
const { adminAuth } = require('../middleware/adminAuth');

router.use((req, res, next) => {
  console.log('Request URL:', req.url);
  console.log('Request Method:', req.method);
  next();
});

async function getNinjaVanToken() {
  try {
    const response = await axios.post(`${API_BASE_URL}/${COUNTRY_CODE}/2.0/oauth/access_token`, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials"
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting NinjaVan access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with NinjaVan');
  }
}

async function createNinjaVanDelivery(orderData, shippingAddress, customerInfo) {
  try {
    if (!shippingAddress) {
      console.error('Missing shipping address for NinjaVan delivery');
      throw new Error('Missing shipping address');
    }
    
    if (!customerInfo || !customerInfo.first_name) {
      console.error('Missing customer info for NinjaVan delivery');
      throw new Error('Missing customer info');
    }
    
    const token = await getNinjaVanToken();
    const totalWeight = orderData.items.reduce((sum, item) => sum + (item.quantity * 0.5), 0);
    
    // Extract postcode from shipping address if possible
    let postcode = '';
    const postcodeMatch = shippingAddress.match(/\d{6}/);
    if (postcodeMatch) {
      postcode = postcodeMatch[0];
    }
    
    const deliveryRequest = {
      service_type: "Parcel",
      service_level: "Standard",
      requested_tracking_number: `ORD-${orderData.order_id}`,
      reference: {
        merchant_order_number: `ORD-${orderData.order_id}`
      },
      from: {
        name: "FengShui E-Commerce Store",
        phone_number: "+6563337193", 
        email: "store@fengshui-ecommerce.com", 
        address: {
          address1: "30 Jln Kilang Barat", 
          address2: "",
          country: COUNTRY_CODE,
          postcode: "159363" 
        }
      },
      to: {
        name: `${customerInfo.first_name} ${customerInfo.last_name}`,
        phone_number: customerInfo.phone || "+6502700553", 
        email: customerInfo.email,
        address: {
          address1: shippingAddress.split(',')[0] || shippingAddress, 
          address2: "",
          country: COUNTRY_CODE,
          postcode: postcode || "000000" 
        }
      },
      parcel_job: {
        is_pickup_required: false, 
        delivery_start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        delivery_timeslot: {
          start_time: "09:00",
          end_time: "18:00",
          timezone: "Asia/Singapore" 
        },
        delivery_instructions: "Please handle with care.",
        dimensions: {
          weight: totalWeight > 0 ? totalWeight : 0.5, 
          size: totalWeight > 5 ? "L" : totalWeight > 2 ? "M" : "S" 
        }
      }
    };
    
    console.log('Creating NinjaVan delivery with request:', {
      order_id: orderData.order_id,
      customer: `${customerInfo.first_name} ${customerInfo.last_name}`,
      shipping_address: shippingAddress
    });
    
    const response = await axios.post(
      `${API_BASE_URL}/${COUNTRY_CODE}/4.2/orders`, 
      deliveryRequest,
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating NinjaVan delivery:', error.response?.data || error.message);
    throw error;
  }
}

router.post(
  '/',
  [
    // auth,
    body('address', 'Shipping address is required').notEmpty(),
    body('payment_method', 'Payment method is required').isIn(['credit_card', 'paypal', 'bank_transfer', 'cod'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const userId = req.user.user.id;
      const { address, payment_method } = req.body;
      const [userInfo] = await connection.query('SELECT first_name, last_name, email, phone FROM users WHERE user_id = ?', [userId]);
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
      let totalPrice = 0;
      cartItems.forEach(item => {
        totalPrice += parseFloat(item.price) * item.quantity;
      });
      const [orderResult] = await connection.query(
        'INSERT INTO orders (user_id, total_price, order_status, payment_status) VALUES (?, ?, ?, ?)',
        [userId, totalPrice, 'pending', 'pending']
      );
      const orderId = orderResult.insertId;
      for (const item of cartItems) {
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
        if (item.variant_id) {
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
          await connection.query(
            'INSERT INTO inventory (variant_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)',
            [item.variant_id, 'remove', item.quantity, `Order ${orderId}`]
          );
        } else {
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
            await connection.query(
              'INSERT INTO inventory (variant_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)',
              [variantId, 'remove', item.quantity, `Order ${orderId}`]
            );
          }
        }
      }
      await connection.query(
        'INSERT INTO shipping (order_id, user_id, address, status) VALUES (?, ?, ?, ?)',
        [orderId, userId, address, 'pending']
      );
      await connection.query(
        'INSERT INTO payments (order_id, user_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?)',
        [orderId, userId, totalPrice, payment_method, 'pending']
      );
      await connection.query('DELETE FROM cart WHERE user_id = ?', [userId]);
      await connection.commit();
      let deliveryInfo = null;
      if (payment_method === 'cod' || payment_method === 'credit_card') {
        try {
          deliveryInfo = await createNinjaVanDelivery(
            { order_id: orderId, items: cartItems },
            address,
            userInfo[0]
          );
          if (deliveryInfo && deliveryInfo.tracking_number) {
            await db.query(
              'UPDATE shipping SET tracking_number = ?, carrier = ? WHERE order_id = ?',
              [deliveryInfo.tracking_number, 'NinjaVan', orderId]
            );
          }
        } catch (deliveryError) {
          console.error('Failed to create delivery for order:', deliveryError);
        }
      }
      res.status(201).json({
        message: 'Order created successfully',
        order: {
          order_id: orderId,
          total_price: totalPrice,
          items: cartItems,
          tracking: deliveryInfo ? {
            carrier: 'NinjaVan',
            tracking_number: deliveryInfo.tracking_number
          } : null
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

router.get('/', async (req, res) => {
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
    if (!isAdmin) {
      query += ' WHERE o.user_id = ?';
      params.push(userId);
    }
    query += ' ORDER BY o.created_at DESC';
    const [orders] = await db.query(query, params);
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.user.id;
    const isAdmin = req.user.user.userType === 'admin';
    let query = `
      SELECT o.*, u.first_name, u.last_name, u.email, u.phone
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      WHERE o.order_id = ?
    `;
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
    const [shipping] = await db.query('SELECT * FROM shipping WHERE order_id = ?', [orderId]);
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

router.put('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { order_status, payment_status, shipping_status, tracking_number } = req.body;
    const [orders] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order_status) {
      if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(order_status)) {
        return res.status(400).json({ message: 'Invalid order status' });
      }
      await db.query('UPDATE orders SET order_status = ?, updated_at = NOW() WHERE order_id = ?', [order_status, orderId]);
    }
    if (payment_status) {
      if (!['pending', 'completed', 'failed', 'refunded'].includes(payment_status)) {
        return res.status(400).json({ message: 'Invalid payment status' });
      }
      await db.query('UPDATE payments SET status = ?, updated_at = NOW() WHERE order_id = ?', [payment_status, orderId]);
    }
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

router.delete('/:id', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const orderId = req.params.id;
    const userId = req.user.user.id;
    const isAdmin = req.user.user.userType === 'admin';
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
    if (order.order_status !== 'pending' && order.order_status !== 'processing') {
      await connection.rollback();
      return res.status(400).json({ message: 'Only pending or processing orders can be cancelled' });
    }
    const [items] = await connection.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
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
        await connection.query(
          'INSERT INTO inventory (variant_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)',
          [variantId, 'add', item.quantity, `Order ${orderId} cancelled`]
        );
      }
    }
    await connection.query(
      'UPDATE orders SET order_status = ?, updated_at = NOW() WHERE order_id = ?',
      ['cancelled', orderId]
    );
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

router.put('/:id/payment', async (req, res) => {
});

router.put('/:id/shipping', async (req, res) => {
});

router.get('/check/:productId', async (req, res) => {
  try {
    const userId = req.user.user.id; 
    const productId = req.params.productId;
    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }
    if (!productId || isNaN(parseInt(productId))) { 
        return res.status(400).json({ message: 'Invalid product ID' });
    }
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
    res.status(500).json({ message: 'Server error checking purchase status' });
  }
});

// Admin: Confirm payment manually
router.post('/:orderId/confirm-payment', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { orderId } = req.params;
    
    // Check if order and payment exist
    const [[orderInfo]] = await connection.query(
      `SELECT o.order_id, o.order_status, o.payment_status, 
              p.status as payment_table_status,
              u.first_name, u.last_name, u.email, u.phone, u.user_id
       FROM orders o 
       LEFT JOIN payments p ON o.order_id = p.order_id 
       JOIN users u ON o.user_id = u.user_id
       WHERE o.order_id = ?`,
      [orderId]
    );
    
    if (!orderInfo) {
      await connection.rollback();
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify the order is in processing status and payment is waiting for confirmation
    if (orderInfo.order_status !== 'processing' || 
        orderInfo.payment_table_status !== 'waiting_for_confirmation') {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Invalid order or payment status for confirmation'
      });
    }

    // Update order status to for_packing and payment status to completed
    await connection.query(
      'UPDATE orders SET order_status = ?, payment_status = ?, updated_at = NOW() WHERE order_id = ?',
      ['for_packing', 'paid', orderId]
    );

    // Update payment status to completed
    await connection.query(
      'UPDATE payments SET status = ?, updated_at = NOW() WHERE order_id = ?',
      ['completed', orderId]
    );

    await connection.commit();
    
    // Send notification to customer that their order is now being packed
    // ... notification code ...

    res.json({ 
      message: 'Payment confirmed successfully',
      order_status: 'for_packing',
      payment_status: 'completed'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error confirming payment:', error);
    res.status(500).json({ message: 'Error confirming payment' });
  } finally {
    connection.release();
  }
});

// Admin: Update order status
router.put('/:orderId/status', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { orderId } = req.params;
    const { status } = req.body;
    
    const validStatuses = [
      'pending',
      'for_packing',
      'packed',
      'for_shipping',
      'picked_up',
      'delivered',
      'completed',
      'returned'
    ];
    
    if (!validStatuses.includes(status)) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }
    
    // Check if order exists
    const [[order]] = await connection.query(
      'SELECT * FROM orders WHERE order_id = ?',
      [orderId]
    );
    
    if (!order) {
      await connection.rollback();
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Additional logic for specific status transitions
    if (status === 'for_shipping' && order.order_status === 'packed') {
      // When moving to for_shipping status, check if we need to create NinjaVan delivery
      const [[shippingInfo]] = await connection.query(
        'SELECT * FROM shipping WHERE order_id = ? AND tracking_number IS NULL',
        [orderId]
      );
      
      if (shippingInfo) {
        // Get customer information
        const [[customerInfo]] = await connection.query(
          'SELECT u.first_name, u.last_name, u.email, u.phone FROM users u JOIN orders o ON u.user_id = o.user_id WHERE o.order_id = ?',
          [orderId]
        );
        
        // Get order items
        const [orderItems] = await connection.query(
          'SELECT * FROM order_items WHERE order_id = ?',
          [orderId]
        );
        
        try {
          // Create delivery in NinjaVan
          console.log('Creating NinjaVan delivery for order:', orderId);
          const deliveryData = await createNinjaVanDelivery(
            { order_id: orderId, items: orderItems },
            shippingInfo.address,
            customerInfo
          );
          
          if (deliveryData && deliveryData.tracking_number) {
            await connection.query(
              'UPDATE shipping SET tracking_number = ?, carrier = ? WHERE order_id = ?',
              [deliveryData.tracking_number, 'NinjaVan', orderId]
            );
          }
        } catch (deliveryError) {
          console.error('Failed to create NinjaVan delivery:', deliveryError);
          // Continue with status update even if delivery creation fails
        }
      }
    }
    
    // Update order status
    await connection.query(
      'UPDATE orders SET order_status = ? WHERE order_id = ?',
      [status, orderId]
    );
    
    // If status is delivered, create order confirmation entry with deadline
    if (status === 'delivered') {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7); // 7 days deadline
      
      // Check if confirmation already exists
      const [[existingConfirmation]] = await connection.query(
        'SELECT * FROM order_confirmations WHERE order_id = ?',
        [orderId]
      );
      
      if (!existingConfirmation) {
        await connection.query(
          'INSERT INTO order_confirmations (order_id, deadline, status) VALUES (?, ?, ?)',
          [orderId, deadline, 'pending']
        );
      }
    }
    
    await connection.commit();
    res.json({ 
      message: 'Order status updated successfully',
      new_status: status
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Failed to update order status' });
  } finally {
    connection.release();
  }
});

// Customer: Confirm order received or initiate return
// Removed auth for now for testing purposes
router.post('/:orderId/confirmation', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { orderId } = req.params;
    const { action } = req.body; // 'receive' or 'return'
    const userId = req.user.id;
    
    if (!['receive', 'return'].includes(action)) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Invalid action. Must be either "receive" or "return"' 
      });
    }
    
    // Check if order exists and belongs to user
    const [[order]] = await connection.query(
      'SELECT o.*, oc.confirmation_id, oc.status as confirmation_status, oc.deadline ' +
      'FROM orders o ' +
      'LEFT JOIN order_confirmations oc ON o.order_id = oc.order_id ' +
      'WHERE o.order_id = ? AND o.user_id = ? AND o.order_status = ?',
      [orderId, userId, 'delivered']
    );
    
    if (!order) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Order not found or not in delivered status' 
      });
    }
    
    if (!order.confirmation_id) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'No confirmation request found for this order' 
      });
    }
    
    if (order.confirmation_status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Order has already been confirmed or returned' 
      });
    }
    
    const now = new Date();
    if (now > new Date(order.deadline)) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Confirmation deadline has passed' 
      });
    }
    
    // Update confirmation status
    await connection.query(
      'UPDATE order_confirmations SET status = ? WHERE confirmation_id = ?',
      [action, order.confirmation_id]
    );
    
    // Update order status
    const newOrderStatus = action === 'receive' ? 'completed' : 'returned';
    await connection.query(
      'UPDATE orders SET order_status = ? WHERE order_id = ?',
      [newOrderStatus, orderId]
    );
    
    await connection.commit();
    res.json({ 
      message: `Order ${action === 'receive' ? 'received' : 'return initiated'} successfully` 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error processing order confirmation:', error);
    res.status(500).json({ message: 'Failed to process order confirmation' });
  } finally {
    connection.release();
  }
});

// Scheduled task to auto-complete orders past deadline
// This should be called by a cron job
router.post('/auto-complete', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Get all pending confirmations past deadline
    const [expiredConfirmations] = await connection.query(
      'SELECT * FROM order_confirmations ' +
      'WHERE status = ? AND deadline < NOW()',
      ['pending']
    );
    
    if (expiredConfirmations.length === 0) {
      await connection.commit();
      return res.json({ message: 'No expired confirmations found' });
    }
    
    // Update confirmation status to auto_completed
    await connection.query(
      'UPDATE order_confirmations SET status = ? ' +
      'WHERE status = ? AND deadline < NOW()',
      ['auto_completed', 'pending']
    );
    
    // Update order status to completed
    const orderIds = expiredConfirmations.map(conf => conf.order_id);
    await connection.query(
      'UPDATE orders SET order_status = ? WHERE order_id IN (?)',
      ['completed', orderIds]
    );
    
    await connection.commit();
    res.json({ 
      message: 'Auto-completed expired confirmations',
      completed_count: expiredConfirmations.length
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error auto-completing orders:', error);
    res.status(500).json({ message: 'Failed to auto-complete orders' });
  } finally {
    connection.release();
  }
});

// Get order details
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    
    const [orders] = await db.query(
      'SELECT o.*, p.status as payment_status, ' +
      'oc.status as confirmation_status, oc.deadline as confirmation_deadline ' +
      'FROM orders o ' +
      'LEFT JOIN payments p ON o.order_id = p.order_id ' +
      'LEFT JOIN order_confirmations oc ON o.order_id = oc.order_id ' +
      'WHERE o.order_id = ? AND o.user_id = ?',
      [orderId, userId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Get order items
    const [orderItems] = await db.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    );
    
    const order = orders[0];
    order.items = orderItems;
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Failed to fetch order details' });
  }
});

module.exports = router; 