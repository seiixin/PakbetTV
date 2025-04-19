const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { auth } = require('../middleware/auth');
const db = require('../config/db');

// Dragonpay API configuration
const MERCHANT_ID = process.env.DRAGONPAY_MERCHANT_ID || 'TEST'; // Replace with your merchant ID in production
const API_KEY = process.env.DRAGONPAY_API_KEY || 'test_key'; // Replace with your API key in production
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://gw.dragonpay.ph/api/collect/v1' 
  : 'https://test.dragonpay.ph/api/collect/v1';

// Dragonpay postback URL verification secret (for HMAC-SHA256)
const SECRET_KEY_SHA256 = process.env.DRAGONPAY_SECRET_KEY_SHA256 || 'test_sha256_key';

/**
 * @route POST api/transactions/orders
 * @desc Create a new order
 * @access Private
 */
router.post('/orders',async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { user_id, total_amount: totalPrice, items } = req.body;
    
    // Insert order
    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total_price, order_status) VALUES (?, ?, ?)',
      [user_id, totalPrice, 'pending']
    );
    
    const orderId = orderResult.insertId;
    
    // Insert order items
    for (const item of items) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );
    }
    
    await connection.commit();
    
    res.status(201).json({ 
      message: 'Order created successfully', 
      order_id: orderId,
      status: 'pending'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Failed to create order' });
  } finally {
    connection.release();
  }
});

/**
 * @route POST api/transactions/payment
 * @desc Process payment through Dragonpay
 * @access Private
 */
router.post('/payment', async (req, res) => {
  try {
    const { order_id, payment_method, payment_details } = req.body;
    
    // Get order details
    const [orders] = await db.query(
      'SELECT o.*, u.email FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.order_id = ?', 
      [order_id]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = orders[0];
    
    // Create unique transaction ID
    const txnId = `order_${order_id}_${Date.now()}`;
    
    // Store payment record
    const [paymentResult] = await db.query(
      'INSERT INTO payments (order_id, user_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?)',
      [order_id, order.user_id, order.total_price, payment_method, 'pending']
    );
    
    const paymentId = paymentResult.insertId;
    
    if (payment_method === 'dragonpay') {
      // Create Dragonpay payment request
      const requestUrl = `${BASE_URL}/${txnId}/post`;
      
      // Create auth token for basic auth
      const authToken = Buffer.from(`${MERCHANT_ID}:${API_KEY}`).toString('base64');
      
      // Construct payment request payload
      const payload = {
        Amount: parseFloat(order.total_price).toFixed(2),
        Currency: "PHP",
        Description: `Order #${order_id}`,
        Email: payment_details.email || order.email,
        // Optional: Include ProcId if specified payment channel is desired
        // ProcId: "GCSH", // For GCash
      };
      
      // Make request to Dragonpay API
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      
      // Log the raw response status and text
      console.log('Dragonpay Response Status:', response.status);
      const responseText = await response.text();
      console.log('Dragonpay Raw Response Text:', responseText);

      // Now try to parse the JSON
      const data = JSON.parse(responseText);

      if (data.Status === 'S') {
        // Update payment record with reference number
        await db.query(
          'UPDATE payments SET reference_number = ? WHERE payment_id = ?',
          [data.RefNo, paymentId]
        );
        
        // Send payment URL back to client
        res.json({
          success: true,
          payment_id: paymentId,
          payment_url: data.Url,
          reference_number: data.RefNo
        });
      } else {
        throw new Error(data.Message || 'Payment initialization failed');
      }
    } else {
      res.status(400).json({ message: 'Unsupported payment method' });
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ message: error.message || 'Failed to process payment' });
  }
});

/**
 * @route GET api/transactions/verify
 * @desc Verify transaction status from Dragonpay
 * @access Public
 */
router.get('/verify', async (req, res) => {
  try {
    const { txnId, refNo } = req.query;
    
    // Get order info from transaction ID
    const orderIdMatch = txnId.match(/order_(\d+)_/);
    if (!orderIdMatch) {
      return res.status(400).json({ message: 'Invalid transaction ID format' });
    }
    
    const orderId = orderIdMatch[1];
    
    // Get order details
    const [orders] = await db.query(
      'SELECT o.*, p.reference_number, p.status AS payment_status FROM orders o ' +
      'LEFT JOIN payments p ON o.order_id = p.order_id ' +
      'WHERE o.order_id = ? AND p.reference_number = ?', 
      [orderId, refNo]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = orders[0];
    
    res.json({
      status: order.payment_status,
      message: 'Transaction verified',
      order: {
        id: order.order_id,
        total_amount: order.total_amount,
        status: order.order_status
      }
    });
  } catch (error) {
    console.error('Transaction verification error:', error);
    res.status(500).json({ message: 'Failed to verify transaction' });
  }
});

/**
 * @route POST api/transactions/postback
 * @desc Handle postback from Dragonpay
 * @access Public
 */
router.post('/postback', async (req, res) => {
  try {
    // Extract parameters from request
    const { txnid, refno, status, message, amount, digest, signature } = req.body;
    
    console.log('Received postback:', { txnid, refno, status, message, amount });
    
    // Verify HMAC-SHA256 signature
    const dataToSign = `${txnid}:${refno}:${status}:${message}:${amount}`;
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY_SHA256)
      .update(dataToSign)
      .digest('hex')
      .toUpperCase();
    
    if (signature !== expectedSignature) {
      console.error('Invalid signature', { received: signature, expected: expectedSignature });
      return res.status(400).send('result=INVALID_SIGNATURE');
    }
    
    // Extract order ID from transaction ID
    const orderIdMatch = txnid.match(/order_(\d+)_/);
    if (!orderIdMatch) {
      console.error('Invalid transaction ID format:', txnid);
      return res.status(400).send('result=INVALID_TXNID');
    }
    
    const orderId = orderIdMatch[1];
    
    // Update payment status
    await db.query(
      'UPDATE payments SET status = ?, reference_number = ? WHERE order_id = ?',
      [mapDragonpayStatus(status), refno, orderId]
    );
    
    // Update order status
    if (status === 'S') {
      await db.query(
        'UPDATE orders SET order_status = ?, payment_status = ? WHERE order_id = ?',
        ['processing', 'paid', orderId]
      );
    } else if (status === 'F') {
      await db.query(
        'UPDATE orders SET order_status = ?, payment_status = ? WHERE order_id = ?',
        ['cancelled', 'failed', orderId]
      );
    } else if (status === 'P') {
      await db.query(
        'UPDATE orders SET payment_status = ? WHERE order_id = ?',
        ['pending', orderId]
      );
    }
    
    // Send success response
    res.send('result=OK');
  } catch (error) {
    console.error('Postback processing error:', error);
    res.status(500).send('result=SERVER_ERROR');
  }
});

/**
 * Map Dragonpay status codes to our internal status
 */
function mapDragonpayStatus(dpStatus) {
  switch(dpStatus) {
    case 'S': return 'completed';
    case 'F': return 'failed';
    case 'P': return 'pending';
    case 'U': return 'unknown';
    case 'R': return 'refunded';
    case 'K': return 'chargeback';
    case 'V': return 'void';
    case 'A': return 'authorized';
    default: return 'unknown';
  }
}

module.exports = router; 