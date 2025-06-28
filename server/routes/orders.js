const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth, admin } = require('../middleware/auth');
const axios = require('axios');
const config = require('../config/keys');
const { v4: uuidv4 } = require('uuid');
const ninjaVanAuth = require('../services/ninjaVanAuth');
const API_BASE_URL = config.NINJAVAN_API_URL || 'https://api.ninjavan.co';
const COUNTRY_CODE = config.NINJAVAN_COUNTRY_CODE || 'SG';
const CLIENT_ID = config.NINJAVAN_CLIENT_ID;
const CLIENT_SECRET = config.NINJAVAN_CLIENT_SECRET;
async function createNinjaVanDelivery(orderData, shippingAddress, customerInfo) {
  try {
    // Validate required customer information - STRICT: No fallbacks allowed
    if (!customerInfo.phone || !customerInfo.phone.trim()) {
      throw new Error('Customer phone number is required for delivery. Order cannot proceed without a valid phone number.');
    }
    
    if (!customerInfo.email || !customerInfo.email.trim()) {
      throw new Error('Customer email is required for delivery. Order cannot proceed without a valid email.');
    }
    
    if (!customerInfo.first_name || !customerInfo.first_name.trim()) {
      throw new Error('Customer name is required for delivery. Order cannot proceed without a valid name.');
    }

    const token = await ninjaVanAuth.getValidToken();
    const totalWeight = orderData.items.reduce((sum, item) => sum + (item.quantity * 0.5), 0);
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
        phone_number: customerInfo.phone,
        email: customerInfo.email,
        address: {
          address1: shippingAddress.split(',')[0] || shippingAddress, 
          address2: "",
          country: COUNTRY_CODE,
          postcode: shippingAddress.match(/\d{6}/) ? shippingAddress.match(/\d{6}/)[0] : "" 
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
    auth,
    body('address', 'Shipping address is required').notEmpty(),
    body('payment_method', 'Payment method is required').isIn(['credit_card', 'paypal', 'bank_transfer', 'cod', 'dragonpay'])
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
      
      // Generate a unique order_code using UUID
      const orderCode = uuidv4();
      
      // Get the last order_id for this user
      const [lastOrder] = await connection.query(
        'SELECT order_id FROM orders WHERE user_id = ? ORDER BY order_id DESC LIMIT 1',
        [userId]
      );
      
      // Insert the order with order_code
      const [orderResult] = await connection.query(
        'INSERT INTO orders (user_id, total_price, order_status, payment_status, order_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [userId, totalPrice, 'pending', 'pending', orderCode]
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
      }

      await connection.query(
        'INSERT INTO shipping (order_id, user_id, address, status) VALUES (?, ?, ?, ?)',
        [orderId, userId, address, 'pending']
      );

      // Create shipping_details record with structured address
      const addressParts = address.split(',').map(part => part.trim());
      const address1 = addressParts[0] || '';
      const postcode = address.match(/\d{5,6}/) ? address.match(/\d{5,6}/)[0] : '';
      const city = addressParts.length > 2 ? addressParts[addressParts.length - 2] : '';
      const state = addressParts.length > 1 ? addressParts[addressParts.length - 1] : '';

      await connection.query(
        `INSERT INTO shipping_details (
          order_id, address1, city, state, postcode, country, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [orderId, address1, city, state, postcode, 'MY']
      );

      await connection.query(
        'INSERT INTO payments (order_id, user_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?)',
        [orderId, userId, totalPrice, payment_method, 'pending']
      );

      // Clear the user's cart after successful order creation
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
          order_code: orderCode,
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
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.user?.id;
    const isAdmin = (req.user?.userType || req.user?.user?.userType) === 'admin';
    
    console.log('GET orders - User:', { userId, isAdmin });
    
    if (!userId) {
      return res.status(401).json({ message: 'Invalid user token structure' });
    }

    let query = `
      SELECT o.order_id, o.order_code, o.user_id, o.total_price, o.order_status, o.created_at, o.updated_at,
             u.first_name, u.last_name, u.email,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) AS item_count,
             (SELECT status FROM payments WHERE order_id = o.order_id LIMIT 1) AS payment_status,
             (SELECT status FROM shipping WHERE order_id = o.order_id LIMIT 1) AS shipping_status,
             (SELECT tracking_number FROM shipping WHERE order_id = o.order_id LIMIT 1) AS tracking_number,
             s.address as shipping_address,
             sd.address1, sd.address2, sd.city, sd.state, sd.postcode, sd.country
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      LEFT JOIN shipping s ON o.order_id = s.order_id
      LEFT JOIN shipping_details sd ON o.order_id = sd.order_id
    `;
    const params = [];
    if (!isAdmin) {
      query += ' WHERE o.user_id = ?';
      params.push(userId);
    }
    query += ' ORDER BY o.created_at DESC';
    
    const [orders] = await db.query(query, params);
    
    // Set proper content type and return JSON
    res.setHeader('Content-Type', 'application/json');
    res.json(orders || []);
  } catch (err) {
    console.error('GET orders error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/:id', auth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user?.id || req.user?.user?.id;
    const isAdmin = (req.user?.userType || req.user?.user?.userType) === 'admin';
    
    console.log('GET order by ID - User:', { userId, isAdmin, orderId });
    
    if (!userId) {
      return res.status(401).json({ message: 'Invalid user token structure' });
    }

    let query = `
      SELECT o.*, u.first_name, u.last_name, u.email, u.phone,
             (SELECT tracking_number FROM shipping WHERE order_id = o.order_id LIMIT 1) AS shipping_tracking_number,
             s.address as shipping_address,
             sd.address1, sd.address2, sd.city, sd.state, sd.postcode, sd.country
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      LEFT JOIN shipping s ON o.order_id = s.order_id
      LEFT JOIN shipping_details sd ON o.order_id = sd.order_id
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
    
    // Use tracking number from either orders table or shipping table
    if (order.shipping_tracking_number && !order.tracking_number) {
      order.tracking_number = order.shipping_tracking_number;
    }
    
    // Remove temporary field
    delete order.shipping_tracking_number;
    
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
    
    // If shipping table has tracking number but order doesn't, prioritize shipping table
    if (shipping.length > 0 && shipping[0].tracking_number && !order.tracking_number) {
      order.tracking_number = shipping[0].tracking_number;
    }
    
    res.json({
      ...order,
      items,
      shipping: shipping.length > 0 ? {
        ...shipping[0],
        address_details: {
          address1: order.address1,
          address2: order.address2,
          city: order.city,
          state: order.state,
          postcode: order.postcode,
          country: order.country
        }
      } : null,
      payment: payments.length > 0 ? payments[0] : null
    });
  } catch (err) {
    console.error('GET order by ID error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
router.put('/:id', [auth, admin], async (req, res) => {
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
router.delete('/:id', auth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const orderId = req.params.id;
    const userId = req.user?.id || req.user?.user?.id;
    const isAdmin = (req.user?.userType || req.user?.user?.userType) === 'admin';
    
    console.log('DELETE order - User:', { userId, isAdmin, orderId });
    
    if (!userId) {
      await connection.rollback();
      return res.status(401).json({ message: 'Invalid user token structure' });
    }

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
router.put('/:id/payment', [auth, admin], async (req, res) => {
});
router.put('/:id/shipping', [auth, admin], async (req, res) => {
});
router.get('/check/:productId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
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
module.exports = router; 