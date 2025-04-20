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
    
    // Insert order items and deduct stock
    for (const item of items) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );

      // --- BEGIN STOCK DEDUCTION --- 
      // Check stock in the base products table first
      const [[product]] = await connection.query(
        'SELECT stock FROM products WHERE product_id = ?',
        [item.product_id]
      );

      if (!product) {
         await connection.rollback();
         console.error(`Product not found during stock check: ID ${item.product_id}`);
         // Use a generic message for the client
         return res.status(400).json({ message: `Product details not found for one of the items.` });
      }
      
      const currentStock = product.stock;
      const requestedQuantity = item.quantity;

      if (currentStock < requestedQuantity) {
          await connection.rollback();
          // Provide product name if possible, or just ID
          return res.status(400).json({ message: `Not enough stock for product ID ${item.product_id}. Available: ${currentStock}` });
      }

      // Deduct stock from the products table
      const newStock = currentStock - requestedQuantity;
      await connection.query(
        'UPDATE products SET stock = ? WHERE product_id = ?',
        [newStock, item.product_id]
      );

      // Optionally: Record inventory change for base product (if applicable)
      // await connection.query(
      //   'INSERT INTO inventory (product_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)',
      //   [item.product_id, 'remove', requestedQuantity, `Order ${orderId}`]
      // );
      // --- END STOCK DEDUCTION ---
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
      // Dragonpay configuration
      const MERCHANT_ID = process.env.DRAGONPAY_MERCHANT_ID || 'TEST';
      const SECRET_KEY = process.env.DRAGONPAY_SECRET_KEY || 'test_key';
      
      // Create payload
      const amount = parseFloat(order.total_price).toFixed(2);
      const description = `Order #${order_id}`;
      const email = payment_details.email || order.email;
      const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/transaction-complete`;
      
      // Using HTML redirect method (previously working approach)
      // Format merchant ID in uppercase as required by Dragonpay
      const merchantIdUpper = MERCHANT_ID.toUpperCase();
      
      // Build the digest string as specified by Dragonpay
      const digestString = merchantIdUpper + ':' + txnId + ':' + amount + ':PHP:' + description + ':' + email + ':' + SECRET_KEY;
      
      console.log('Digest string format (without actual secret key):', 
        merchantIdUpper + ':' + txnId + ':' + amount + ':PHP:' + description + ':' + email + ':***');
      
      // Use SHA1 hash as specified in the Dragonpay documentation
      const digest = crypto.createHash('sha1')
        .update(digestString)
        .digest('hex');
      
      console.log('Generated SHA1 digest:', digest);
      
      // Assemble the payload with all required parameters
      const payload = {
        merchantid: merchantIdUpper,
        txnid: txnId,
        amount: amount,
        ccy: 'PHP',
        description: description,
        email: email,
        param1: order_id.toString(),
        digest: digest,
        returnurl: returnUrl
      };
      
      console.log('Dragonpay payload:', payload);
      
      // Construct the URL with parameters
      const redirectUrl = `https://test.dragonpay.ph/Pay.aspx?${new URLSearchParams(payload).toString()}`;
      
      console.log('Redirecting to Dragonpay URL:', redirectUrl);
      
      // Update payment record with reference number
      await db.query(
        'UPDATE payments SET reference_number = ? WHERE payment_id = ?',
        [txnId, paymentId]
      );
      
      // Send payment URL back to client
      res.json({
        success: true,
        payment_id: paymentId,
        payment_url: redirectUrl,
        reference_number: txnId
      });
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
        'UPDATE orders SET order_status = ? WHERE order_id = ?',
        ['processing', orderId]
      );
    } else if (status === 'F') {
      await db.query(
        'UPDATE orders SET order_status = ? WHERE order_id = ?',
        ['cancelled', orderId]
      );
    } else if (status === 'P') {
      await db.query(
        'UPDATE orders SET order_status = ? WHERE order_id = ?',
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