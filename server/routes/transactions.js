const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { auth } = require('../middleware/auth');
const db = require('../config/db');
const MERCHANT_ID = process.env.DRAGONPAY_MERCHANT_ID || 'TEST'; 
const API_KEY = process.env.DRAGONPAY_API_KEY || 'test_key'; 
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://gw.dragonpay.ph/api/collect/v1' 
  : 'https://test.dragonpay.ph/api/collect/v1';
const SECRET_KEY_SHA256 = process.env.DRAGONPAY_SECRET_KEY_SHA256 || 'test_sha256_key';
router.post('/orders',async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { user_id, total_amount: totalPrice, items } = req.body;
    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total_price, order_status) VALUES (?, ?, ?)',
      [user_id, totalPrice, 'pending']
    );
    const orderId = orderResult.insertId;
    for (const item of items) {
      const [orderItemResult] = await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price, variant_id) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price, item.variant_id || null]
      );
      const orderItemId = orderItemResult.insertId;
      if (item.variant_attributes && Object.keys(item.variant_attributes).length > 0) {
        await connection.query(
          'UPDATE order_items SET variant_data = ? WHERE order_item_id = ?',
          [JSON.stringify(item.variant_attributes), orderItemId]
        );
      }
      if (item.variant_id) {
        const [[variant]] = await connection.query(
          'SELECT stock FROM product_variants WHERE variant_id = ?',
          [item.variant_id]
        );
        if (!variant) {
          await connection.rollback();
          console.error(`Variant not found during stock check: ID ${item.variant_id}`);
          return res.status(400).json({ message: `Variant details not found for one of the items.` });
        }
        const currentStock = variant.stock;
        const requestedQuantity = item.quantity;
        if (currentStock < requestedQuantity) {
          await connection.rollback();
          return res.status(400).json({ 
            message: `Not enough stock for product variant. Available: ${currentStock}` 
          });
        }
        const newStock = currentStock - requestedQuantity;
        await connection.query(
          'UPDATE product_variants SET stock = ? WHERE variant_id = ?',
          [newStock, item.variant_id]
        );
      } else {
        const [[product]] = await connection.query(
          'SELECT stock FROM products WHERE product_id = ?',
          [item.product_id]
        );
        if (!product) {
           await connection.rollback();
           console.error(`Product not found during stock check: ID ${item.product_id}`);
           return res.status(400).json({ message: `Product details not found for one of the items.` });
        }
        const currentStock = product.stock;
        const requestedQuantity = item.quantity;
        if (currentStock < requestedQuantity) {
            await connection.rollback();
            return res.status(400).json({ message: `Not enough stock for product ID ${item.product_id}. Available: ${currentStock}` });
        }
        const newStock = currentStock - requestedQuantity;
        await connection.query(
          'UPDATE products SET stock = ? WHERE product_id = ?',
          [newStock, item.product_id]
        );
      }
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
router.post('/payment', async (req, res) => {
  try {
    const { order_id, payment_method, payment_details } = req.body;
    const [orders] = await db.query(
      'SELECT o.*, u.email FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.order_id = ?', 
      [order_id]
    );
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const order = orders[0];
    const txnId = `order_${order_id}_${Date.now()}`;
    const [paymentResult] = await db.query(
      'INSERT INTO payments (order_id, user_id, amount, payment_method, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [order_id, order.user_id, order.total_price, payment_method, 'pending']
    );
    
    // Make sure order timestamps are set
    await db.query(
      'UPDATE orders SET created_at = IF(created_at IS NULL, NOW(), created_at), updated_at = NOW() WHERE order_id = ?',
      [order_id]
    );
    
    const paymentId = paymentResult.insertId;
    if (payment_method === 'dragonpay') {
      const MERCHANT_ID = process.env.DRAGONPAY_MERCHANT_ID || 'TEST';
      const SECRET_KEY = process.env.DRAGONPAY_SECRET_KEY || 'test_key';
      const amount = parseFloat(order.total_price).toFixed(2);
      const description = `Order #${order_id}`;
      const email = payment_details.email || order.email;
      const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/transaction-complete`;
      const merchantIdUpper = MERCHANT_ID.toUpperCase();
      const digestString = merchantIdUpper + ':' + txnId + ':' + amount + ':PHP:' + description + ':' + email + ':' + SECRET_KEY;
      console.log('Digest string format (without actual secret key):', 
        merchantIdUpper + ':' + txnId + ':' + amount + ':PHP:' + description + ':' + email + ':***');
      const digest = crypto.createHash('sha1')
        .update(digestString)
        .digest('hex');
      console.log('Generated SHA1 digest:', digest);
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
      const redirectUrl = `https://test.dragonpay.ph/Pay.aspx?${new URLSearchParams(payload).toString()}`;
      console.log('Redirecting to Dragonpay URL:', redirectUrl);
      await db.query(
        'UPDATE payments SET reference_number = ? WHERE payment_id = ?',
        [txnId, paymentId]
      );
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
router.get('/verify', async (req, res) => {
  try {
    const { txnId, refNo } = req.query;
    const orderIdMatch = txnId.match(/order_(\d+)_/);
    if (!orderIdMatch) {
      return res.status(400).json({ message: 'Invalid transaction ID format' });
    }
    const orderId = orderIdMatch[1];
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
router.post('/postback', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { txnid, refno, status, message, amount, digest, signature } = req.body;
    console.log('Received postback:', { txnid, refno, status, message, amount });
    
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
    
    const orderIdMatch = txnid.match(/order_(\d+)_/);
    if (!orderIdMatch) {
      console.error('Invalid transaction ID format:', txnid);
      return res.status(400).send('result=INVALID_TXNID');
    }
    
    const orderId = orderIdMatch[1];
    
    // Update payment reference number regardless of status
    await connection.query(
      'UPDATE payments SET reference_number = ?, created_at = IF(created_at IS NULL, NOW(), created_at), updated_at = NOW() WHERE order_id = ?',
      [refno, orderId]
    );
    
    // Update order status based on Dragonpay status
    if (status === 'S') {
      // Update payment status to waiting_for_confirmation
      await connection.query(
        'UPDATE payments SET status = ?, created_at = IF(created_at IS NULL, NOW(), created_at), updated_at = NOW() WHERE order_id = ?',
        ['waiting_for_confirmation', orderId]
      );

      // Update order status to processing
      await connection.query(
        'UPDATE orders SET order_status = ?, payment_status = ?, created_at = IF(created_at IS NULL, NOW(), created_at), updated_at = NOW() WHERE order_id = ?',
        ['processing', 'paid', orderId]
      );
      
      // Get order info for NinjaVan integration
      const [[orderInfo]] = await connection.query(
        `SELECT o.*, u.first_name, u.last_name, u.email, u.phone,
         s.address as shipping_address
         FROM orders o
         JOIN users u ON o.user_id = u.user_id
         JOIN shipping s ON o.order_id = s.order_id
         WHERE o.order_id = ?`,
        [orderId]
      );
      
      if (orderInfo) {
        // Get order items
        const [orderItems] = await connection.query(
          'SELECT * FROM order_items WHERE order_id = ?',
          [orderId]
        );
        
        try {
          // Create delivery via NinjaVan API
          const deliveryData = await createNinjaVanDelivery(
            { order_id: orderId, items: orderItems },
            orderInfo.shipping_address,
            orderInfo
          );
          
          if (deliveryData && deliveryData.tracking_number) {
            await connection.query(
              'UPDATE shipping SET tracking_number = ?, carrier = ? WHERE order_id = ?',
              [deliveryData.tracking_number, 'NinjaVan', orderId]
            );
          }
        } catch (deliveryError) {
          console.error('Failed to create NinjaVan delivery:', deliveryError);
          // Don't fail the transaction, just log the error
        }
      }
    } else if (status === 'F') {
      // Payment failed
      await connection.query(
        'UPDATE orders SET order_status = ?, payment_status = ?, created_at = IF(created_at IS NULL, NOW(), created_at), updated_at = NOW() WHERE order_id = ?',
        ['cancelled', 'failed', orderId]
      );
      
      // Also update the payment status in payments table
      await connection.query(
        'UPDATE payments SET status = ?, created_at = IF(created_at IS NULL, NOW(), created_at), updated_at = NOW() WHERE order_id = ?',
        ['failed', orderId]
      );
    } else if (status === 'P') {
      // Payment pending
      await connection.query(
        'UPDATE orders SET order_status = ?, payment_status = ?, created_at = IF(created_at IS NULL, NOW(), created_at), updated_at = NOW() WHERE order_id = ?',
        ['pending', 'pending', orderId]
      );
      
      // Also update the payment status in payments table
      await connection.query(
        'UPDATE payments SET status = ?, created_at = IF(created_at IS NULL, NOW(), created_at), updated_at = NOW() WHERE order_id = ?',
        ['pending', orderId]
      );
    }
    
    await connection.commit();
    
    res.send('result=OK');
  } catch (error) {
    await connection.rollback();
    console.error('Dragonpay postback error:', error);
    res.status(500).send('Error processing payment callback');
  } finally {
    connection.release();
  }
});
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

// Development-only endpoint for manually setting order status (disabled in production)
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev/update-status', async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      const { order_id, status } = req.body;
      
      if (!order_id || !status) {
        return res.status(400).json({ message: 'Order ID and status are required' });
      }
      
      console.log(`[DEV] Manually updating order ${order_id} to status: ${status}`);
      
      if (status === 'S' || status === 'success') {
        // Update payment status to waiting_for_confirmation
        await connection.query(
          'UPDATE payments SET status = ?, created_at = IF(created_at IS NULL, NOW(), created_at), updated_at = NOW() WHERE order_id = ?',
          ['waiting_for_confirmation', order_id]
        );

        // Update order status to processing and payment status to awaiting_for_confirmation
        await connection.query(
          'UPDATE orders SET order_status = ?, payment_status = ?, created_at = IF(created_at IS NULL, NOW(), created_at), updated_at = NOW() WHERE order_id = ?',
          ['processing', 'awaiting_for_confirmation', order_id]
        );
        
        await connection.commit();
        return res.json({ 
          message: 'Success: Order status updated to "processing" and payment status to "awaiting_for_confirmation"',
          order_id,
          order_status: 'processing',
          payment_status: 'awaiting_for_confirmation' 
        });
      } else if (status === 'F' || status === 'failed') {
        // Payment failed
        await connection.query(
          'UPDATE orders SET order_status = ?, payment_status = ?, created_at = IF(created_at IS NULL, NOW(), created_at), updated_at = NOW() WHERE order_id = ?',
          ['cancelled', 'failed', order_id]
        );
        
        // Also update the payment status in payments table
        await connection.query(
          'UPDATE payments SET status = ?, created_at = IF(created_at IS NULL, NOW(), created_at), updated_at = NOW() WHERE order_id = ?',
          ['failed', order_id]
        );
        
        await connection.commit();
        return res.json({ 
          message: 'Success: Order status updated to "cancelled" and payment status to "failed"',
          order_id,
          order_status: 'cancelled',
          payment_status: 'failed'
        });
      } else if (status === 'P' || status === 'pending') {
        // Payment pending
        await connection.query(
          'UPDATE orders SET order_status = ?, payment_status = ?, created_at = IF(created_at IS NULL, NOW(), created_at), updated_at = NOW() WHERE order_id = ?',
          ['pending', 'pending', order_id]
        );
        
        // Also update the payment status in payments table
        await connection.query(
          'UPDATE payments SET status = ?, created_at = IF(created_at IS NULL, NOW(), created_at), updated_at = NOW() WHERE order_id = ?',
          ['pending', order_id]
        );
        
        await connection.commit();
        return res.json({ 
          message: 'Success: Order status updated to "pending" and payment status to "pending"',
          order_id,
          order_status: 'pending',
          payment_status: 'pending'
        });
      } else {
        await connection.rollback();
        return res.status(400).json({ message: `Invalid status: ${status}. Valid values are "S"/"success", "F"/"failed", or "P"/"pending"` });
      }
    } catch (error) {
      await connection.rollback();
      console.error('Development status update error:', error);
      res.status(500).json({ message: 'Failed to update order status', error: error.message });
    } finally {
      connection.release();
    }
  });
}

module.exports = router; 