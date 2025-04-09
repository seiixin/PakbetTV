const db = require('../config/db');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

exports.createOrder = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { user_id, items, total_amount } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain items' });
    }
    
    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)',
      [user_id, total_amount, 'pending']
    );
    
    const orderId = orderResult.insertId;
    
    for (const item of items) {
      const { product_id, quantity, price } = item;
      
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, product_id, quantity, price]
      );
      
      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [quantity, product_id]
      );
    }
    
    await connection.commit();
    
    const [orderDetails] = await db.query(
      `SELECT o.*, oi.product_id, oi.quantity, oi.price, p.name as product_name
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.id = ?`,
      [orderId]
    );
    
    res.status(201).json({ 
      message: 'Order created successfully', 
      order_id: orderId,
      details: orderDetails
    });
    
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const [orderDetails] = await db.query(
      `SELECT o.*, oi.product_id, oi.quantity, oi.price, p.name as product_name
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.id = ?`,
      [req.params.id]
    );
    
    if (orderDetails.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.status(200).json(orderDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE user_id = ?',
      [req.params.userId]
    );
    
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const [result] = await db.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.status(200).json({ message: 'Order status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.processPayment = async (req, res) => {
  try {
    const { order_id, payment_method, payment_details } = req.body;
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [order_id]);
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orders[0];
    
    // DragonPay payment gateway integration
    const DRAGONPAY_MERCHANT_ID = process.env.DRAGONPAY_MERCHANT_ID;
    // Remove any trailing space from the secret key
    const DRAGONPAY_SECRET_KEY = process.env.DRAGONPAY_SECRET_KEY.trim();
    
    console.log('Dragonpay Credentials:', {
      merchantId: DRAGONPAY_MERCHANT_ID,
      secretKey: DRAGONPAY_SECRET_KEY,
      secretKeyLength: DRAGONPAY_SECRET_KEY ? DRAGONPAY_SECRET_KEY.length : 0
    });
    
    // Generate a unique transaction ID
    const txnId = `ORDER${order_id}_${Date.now()}`;
    
    // Update order status to pending payment
    await db.query('UPDATE orders SET status = ? WHERE id = ?', 
      ['pending_payment', order_id]);
    
    // Format the amount properly - IMPORTANT: Must be exactly 2 decimal places
    const amount = parseFloat(order.total_amount).toFixed(2);
    
    // Create return and notification URLs
    const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/transaction-complete`;
    const callbackUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/api/transactions/dragonpay-callback`;
    
    // Following Dragonpay integration guide for HTML redirect method
    
    // Create payload for DragonPay form parameters
    const description = `Order #${order_id}`;
    const email = payment_details.email || 'customer@example.com';
    
    // IMPORTANT: According to Dragonpay docs, digest string must be exactly in this format and case
    // Format: merchantId:txnId:amount:currency:description:email:secretKey
    // Note: NO spaces between values and colons
    const merchantIdUpper = DRAGONPAY_MERCHANT_ID.toUpperCase();
    
    // Build the digest string exactly as specified - using direct string concatenation for precision
    const digestString = merchantIdUpper + ':' + txnId + ':' + amount + ':PHP:' + description + ':' + email + ':' + DRAGONPAY_SECRET_KEY;
    
    console.log('Digest string format (without actual secret key):', 
      merchantIdUpper + ':' + txnId + ':' + amount + ':PHP:' + description + ':' + email + ':***************');
      
    console.log('Actual digest string being hashed (sensitive!):', digestString);
    
    // Debug the exact length of each component
    console.log('Component lengths:', {
      merchantId: merchantIdUpper.length,
      txnId: txnId.length,
      amount: amount.length,
      description: description.length,
      email: email.length,
      secretKey: DRAGONPAY_SECRET_KEY.length,
      digestString: digestString.length
    });
    
    // Use SHA1 hash as specified in the DragonPay documentation
    const digest = crypto.createHash('sha1')
      .update(digestString)
      .digest('hex'); // DragonPay expects lowercase hex
    
    console.log('Generated SHA1 digest:', digest);
    
    // Assemble the payload with all params in the EXACT format from the guide
    const payload = {
      merchantid: merchantIdUpper,  // MUST use uppercase for the merchant ID
      txnid: txnId,
      amount: amount,
      ccy: 'PHP',
      description: description,
      email: email,
      param1: order_id.toString(),
      digest: digest,
      returnurl: returnUrl
    };
    
    // Make sure there are no extra parameters
    
    console.log('Dragonpay payload:', payload);
    
    // Construct the URL with parameters
    const redirectUrl = `https://test.dragonpay.ph/Pay.aspx?${new URLSearchParams(payload).toString()}`;
    
    console.log('Redirecting to Dragonpay URL:', redirectUrl);
    
    // Store initial payment record
    try {
      await db.query(
        'INSERT INTO payments (order_id, txn_id, status, message) VALUES (?, ?, ?, ?)',
        [order_id, txnId, 'initiated', 'Payment initiated']
      );
    } catch (err) {
      console.error('Warning: Could not store payment record:', err.message);
      // Continue processing even if this fails
    }
    
    // Return the payment URL for the client to redirect to
    res.status(200).json({
      message: 'Payment initiated',
      transaction_id: txnId,
      order_id: order_id,
      status: 'pending_payment',
      payment_url: redirectUrl
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.dragonpayCallback = async (req, res) => {
  try {
    console.log('Dragonpay callback received:', req.query);
    
    // Dragonpay sends parameters via query string
    const { txnid, refno, status, message, digest, param1 } = req.query;
    
    // param1 contains our order_id as we defined in the processPayment function
    // If param1 is not available, extract from txnid as fallback
    const order_id = param1 || (txnid ? txnid.replace(/^TR\d+/, '') : null);
    
    if (!order_id) {
      console.error('No order ID found in callback parameters');
      return res.status(400).send('Missing order ID');
    }
    
    console.log(`Processing payment callback for order: ${order_id}, status: ${status}`);
    
    // In a production environment, you would validate the digest
    // const DRAGONPAY_SECRET_KEY = process.env.DRAGONPAY_SECRET_KEY;
    // const calculatedDigest = crypto.createHmac('sha1', DRAGONPAY_SECRET_KEY)
    //   .update(`${txnid}:${refno}:${status}:${message}`)
    //   .digest('hex');
    // 
    // if (calculatedDigest !== digest) {
    //   console.error('Invalid digest in callback');
    //   return res.status(403).send('Invalid digest');
    // }
    
    // Update order status based on payment status
    let orderStatus = 'pending';
    
    switch (status) {
      case 'S': // Success
        orderStatus = 'paid';
        break;
      case 'F': // Failed
        orderStatus = 'payment_failed';
        break;
      case 'P': // Pending
        orderStatus = 'payment_pending';
        break;
      case 'U': // Unknown
      case 'R': // Refund
      case 'K': // Chargeback
      case 'V': // Void
      default:
        orderStatus = status;
        break;
    }
    
    // Update order in database
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [orderStatus, order_id]);
    
    // Store payment details
    try {
      await db.query(
        'INSERT INTO payments (order_id, txn_id, ref_no, status, message) VALUES (?, ?, ?, ?, ?)',
        [order_id, txnid, refno, status, message || '']
      );
    } catch (err) {
      console.error('Warning: Could not store payment record:', err.message);
      // Continue processing even if this fails
    }
    
    // If this is a server-to-server callback, return a success status
    if (req.headers['user-agent'] && req.headers['user-agent'].includes('DragonPay')) {
      console.log('Responding to server-to-server Dragonpay callback');
      return res.status(200).send('OK');
    }
    
    // If user is being redirected back, redirect to frontend completion page
    console.log('Redirecting user to transaction completion page');
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/transaction-complete?txnId=${txnid}&refNo=${refno}&status=${status}&message=${encodeURIComponent(message || '')}`);
  } catch (error) {
    console.error('Error processing Dragonpay callback:', error);
    res.status(500).send('Error processing payment callback');
  }
};

exports.verifyTransaction = async (req, res) => {
  try {
    const { txnId, refNo } = req.query;
    
    if (!txnId) {
      return res.status(400).json({ message: 'Transaction ID is required' });
    }
    
    // Find payment record
    let payment = null;
    let paymentFound = false;
    
    try {
      const [payments] = await db.query('SELECT * FROM payments WHERE txn_id = ?', [txnId]);
      if (payments.length > 0) {
        payment = payments[0];
        paymentFound = true;
      }
    } catch (err) {
      console.error('Warning: Could not query payments table:', err.message);
      // Continue processing even if this fails
    }
    
    if (!paymentFound) {
      // If we can't find the payment record, we'll just return the order status
      // Try to extract the order ID from the transaction ID
      const order_id = txnId ? txnId.replace(/^TR\d+/, '') : null;
      
      if (!order_id) {
        return res.status(404).json({ 
          status: 'unknown',
          message: 'Transaction not found and could not determine order ID', 
          verified: false 
        });
      }
      
      // Get order details
      const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [order_id]);
      
      if (orders.length === 0) {
        return res.status(404).json({ 
          status: 'error',
          message: 'Order not found',
          verified: false
        });
      }
      
      const order = orders[0];
      
      // Return order status
      return res.status(200).json({
        verified: true,
        txnId: txnId,
        refNo: refNo || '',
        orderId: order_id,
        status: order.status,
        message: `Order status: ${order.status}`,
        order: {
          id: order.id,
          status: order.status,
          total_amount: order.total_amount,
          created_at: order.created_at
        }
      });
    }
    
    // If we have a payment record, continue as normal
    // Get order details
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [payment.order_id]);
    
    if (orders.length === 0) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Order not found',
        verified: false
      });
    }
    
    const order = orders[0];
    
    // Determine status description
    let statusDescription = '';
    let verifiedStatus = payment.status;
    
    switch (payment.status) {
      case 'S':
      case 'paid':
        statusDescription = 'Payment successful';
        verifiedStatus = 'paid';
        break;
      case 'P':
      case 'payment_pending':
        statusDescription = 'Payment is pending';
        verifiedStatus = 'pending';
        break;
      case 'F':
      case 'payment_failed':
        statusDescription = 'Payment failed';
        verifiedStatus = 'failed';
        break;
      default:
        statusDescription = payment.message || 'Unknown payment status';
        verifiedStatus = 'unknown';
    }
    
    // Return verification result
    res.status(200).json({
      verified: true,
      txnId: payment.txn_id,
      refNo: payment.ref_no || '',
      orderId: payment.order_id,
      status: verifiedStatus,
      originalStatus: payment.status,
      message: statusDescription,
      timestamp: payment.created_at,
      order: {
        id: order.id,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at
      }
    });
  } catch (error) {
    console.error('Error verifying transaction:', error);
    res.status(500).json({ message: 'Failed to verify transaction', error: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    // Get all orders with basic information
    const [orders] = await db.query(
      `SELECT o.*, u.username as user_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );
    
    // Prepare results array
    const ordersWithDetails = [];
    
    // For each order, get items and payment details
    for (const order of orders) {
      // Get order items
      const [items] = await db.query(
        `SELECT oi.*, p.name as product_name
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      
      // Get payment details if any
      let payment = null;
      try {
        const [payments] = await db.query(
          'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
          [order.id]
        );
        if (payments.length > 0) {
          payment = payments[0];
        }
      } catch (err) {
        console.error(`Warning: Could not get payment details for order ${order.id}:`, err.message);
        // Continue processing even if this fails
      }
      
      // Add details to the order object
      const orderWithDetails = {
        ...order,
        items,
        payment
      };
      
      ordersWithDetails.push(orderWithDetails);
    }
    
    res.status(200).json(ordersWithDetails);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ message: error.message });
  }
}; 