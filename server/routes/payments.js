const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

// @route   POST api/payments/dragonpay-callback
// @desc    Handle payment notification from Dragonpay
// @access  Public
router.post('/dragonpay-callback', async (req, res) => {
  try {
    console.log('Received Dragonpay callback:', req.body);
    
    // Extract information from Dragonpay callback
    const { txnid, refno, status, message, param1 } = req.body;
    
    if (!txnid) {
      console.error('Missing transaction ID in Dragonpay callback');
      return res.status(400).send('MISSING_TXNID');
    }
    
    // Get a database connection for transaction
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Extract the actual order ID from the txnid
      // Option 1: Use param1 which contains the actual order ID
      let orderId = param1;
      
      // Option 2: If param1 is not available, parse it from txnid (format: order_X_timestamp)
      if (!orderId && txnid) {
        const parts = txnid.split('_');
        if (parts.length >= 2) {
          orderId = parts[1]; // Extract the order ID part
        }
      }
      
      console.log(`Processing payment for extracted Order ID: ${orderId}`);
      
      if (!orderId) {
        await connection.rollback();
        console.error('Could not extract order ID from transaction ID:', txnid);
        return res.status(400).send('INVALID_ORDER_ID_FORMAT');
      }
      
      // Check if order exists
      const [orders] = await connection.query(
        'SELECT * FROM orders WHERE order_id = ?',
        [orderId]
      );
      
      if (orders.length === 0) {
        await connection.rollback();
        console.error(`Order not found for ID: ${orderId}`);
        return res.status(404).send('ORDER_NOT_FOUND');
      }
      
      // Process response based on status
      // S - Success, F - Failed, P - Pending, U - Unknown, R - Refund, K - Chargeback, V - Void
      let orderStatus, paymentStatus;
      
      switch(status) {
        case 'S': // Success
          orderStatus = 'processing';
          paymentStatus = 'completed';
          break;
        case 'F': // Failed
          orderStatus = 'cancelled';
          paymentStatus = 'failed';
          break;
        case 'P': // Pending
          orderStatus = 'pending';
          paymentStatus = 'pending';
          break;
        case 'R': // Refund
          orderStatus = 'cancelled';
          paymentStatus = 'refunded';
          break;
        case 'K': // Chargeback
        case 'V': // Void
          orderStatus = 'cancelled';
          paymentStatus = 'failed';
          break;
        default:
          orderStatus = 'pending';
          paymentStatus = 'pending';
      }
      
      // Update order status
      await connection.query(
        'UPDATE orders SET order_status = ?, updated_at = NOW() WHERE order_id = ?',
        [orderStatus, orderId]
      );
      
      // Update payment record
      await connection.query(
        'UPDATE payments SET status = ?, reference_number = ?, updated_at = NOW() WHERE order_id = ?',
        [paymentStatus, refno || null, orderId]
      );
      
      await connection.commit();
      
      console.log(`Successfully processed Dragonpay payment for Order ${orderId}. Status: ${status}, New order status: ${orderStatus}`);
      
      // Return a 200 OK response to acknowledge receipt of the notification
      return res.status(200).send('OK');
      
    } catch (err) {
      await connection.rollback();
      console.error('Error processing Dragonpay callback:', err);
      return res.status(500).send('SERVER_ERROR');
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Error in Dragonpay callback handler:', err);
    return res.status(500).send('SERVER_ERROR');
  }
});

module.exports = router; 