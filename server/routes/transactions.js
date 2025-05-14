const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { auth } = require('../middleware/auth');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const deliveryRouter = require('./delivery'); // Import delivery router with createShippingOrder function
const MERCHANT_ID = process.env.DRAGONPAY_MERCHANT_ID || 'TEST'; 
const API_KEY = process.env.DRAGONPAY_API_KEY || 'test_key'; 
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://gw.dragonpay.ph/api/collect/v1' 
  : 'https://test.dragonpay.ph/api/collect/v1';
const SECRET_KEY_SHA256 = process.env.DRAGONPAY_SECRET_KEY_SHA256 || 'test_sha256_key';
const { sendOrderConfirmationEmail } = require('../services/emailService');

router.post('/orders', async (req, res) => {
  const connection = await db.getConnection();
  console.log('Starting order creation process...');
  console.log('Database connection acquired');
  
  try {
    await connection.beginTransaction();
    console.log('Transaction started');
    
    // Log the incoming order data
    console.log('Order data:', req.body);
    
    const { user_id, total_amount, items } = req.body;
    
    // Generate a unique order_code using UUID
    const orderCode = uuidv4();
    console.log(`Generated order_code: ${orderCode}`);
    
    // Create the order record first with the order_code
    console.log('Creating order record with data:', { user_id, total_amount, order_code: orderCode });
    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total_price, order_status, payment_status, order_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [user_id, total_amount, 'processing', 'pending', orderCode]
    );
    
    const orderId = orderResult.insertId;
    console.log(`Order record created with ID: ${orderId}`);

    // Process order items
    console.log('Processing order items:', items);
    for (const item of items) {
      console.log('Processing item:', item);
      const [orderItemResult] = await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price, variant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [orderId, item.product_id, item.quantity, item.price, item.variant_id || null]
      );
      
      const orderItemId = orderItemResult.insertId;
      console.log(`Order item created with ID: ${orderItemId}`);
      
      // Handle variant attributes if present
      if (item.variant_attributes && Object.keys(item.variant_attributes).length > 0) {
        console.log('Updating variant attributes for item:', orderItemId);
        await connection.query(
          'UPDATE order_items SET variant_data = ? WHERE order_item_id = ?',
          [JSON.stringify(item.variant_attributes), orderItemId]
        );
      }

      // Update stock levels
      if (item.variant_id) {
        console.log('Updating variant stock levels');
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
        console.log('Updating product stock levels');
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
          return res.status(400).json({ 
            message: `Not enough stock for product ID ${item.product_id}. Available: ${currentStock}` 
          });
        }
        
        const newStock = currentStock - requestedQuantity;
        await connection.query(
          'UPDATE products SET stock = ? WHERE product_id = ?',
          [newStock, item.product_id]
        );
      }
    }
    
    console.log('All items processed, committing transaction');
    await connection.commit();
    console.log(`Order ${orderId} committed successfully`);
    
    // Verify the order was saved
    const [verifyOrder] = await connection.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    console.log('Verification query result:', verifyOrder);
    
    res.status(201).json({ 
      message: 'Order created successfully', 
      order_id: orderId,
      order_code: orderCode,
      status: 'pending'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating order:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Failed to create order',
      error: error.message 
    });
  } finally {
    console.log('Releasing database connection');
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
    const txnId = order.order_code ? 
      `order_${order.order_code}_${Date.now()}` : 
      `order_${order_id}_${Date.now()}`;
    const [paymentResult] = await db.query(
      'INSERT INTO payments (order_id, user_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?)',
      [order_id, order.user_id, order.total_price, payment_method, 'pending']
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
        reference_number: txnId,
        order_code: order.order_code
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
  try {
    const { txnid, refno, status, message, amount } = req.body;
    console.log('Received postback:', { txnid, refno, status, message, amount });
    const dataToSign = `${txnid}:${refno}:${status}:${message}:${amount}`;
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY_SHA256)
      .update(dataToSign)
      .digest('hex')
      .toUpperCase();
    const signature = req.headers['x-signature'];
    if (signature !== expectedSignature) {
      console.error('Invalid signature', { received: signature, expected: expectedSignature });
      return res.status(400).send('result=INVALID_SIGNATURE');
    }
    
    // First try to extract order_id from transaction ID
    let orderIdMatch = txnid.match(/order_(\d+)_/);
    let orderId = null;
    
    if (orderIdMatch) {
      // Legacy format: order_[ID]_timestamp
      orderId = orderIdMatch[1];
      console.log(`Found legacy order ID format: ${orderId}`);
    } else {
      // New format: order_[UUID]_timestamp
      // Extract the UUID part and find the matching order in the database
      const uuidMatch = txnid.match(/order_([0-9a-f-]+)_/);
      if (uuidMatch) {
        const orderCode = uuidMatch[1];
        console.log(`Found order_code format: ${orderCode}`);
        
        // Look up the order by order_code
        const [orders] = await db.query(
          'SELECT order_id FROM orders WHERE order_code = ?',
          [orderCode]
        );
        
        if (orders.length > 0) {
          orderId = orders[0].order_id;
          console.log(`Resolved order_code ${orderCode} to order_id ${orderId}`);
        }
      }
    }
    
    if (!orderId) {
      console.error('Invalid transaction ID format or order not found:', txnid);
      return res.status(400).send('result=INVALID_TXNID');
    }
    
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Update payment status
      await connection.query(
        'UPDATE payments SET status = ?, reference_number = ? WHERE order_id = ?',
        [mapDragonpayStatus(status), refno, orderId]
      );

      if (status === 'S') {
        // Update order status
        await connection.query(
          'UPDATE orders SET order_status = ?, payment_status = ? WHERE order_id = ?',
          ['for_packing', 'paid', orderId]
        );

        const transactionId = `order_${orderId}_${Date.now()}`;
        await connection.query(
          'UPDATE payments SET transaction_id = ? WHERE order_id = ?',
          [transactionId, orderId]
        );

        // Get order details for email
        const [orders] = await connection.query(
          `SELECT o.*, u.first_name, u.last_name, u.email, u.phone,
           s.address as shipping_address, s.tracking_number,
           COALESCE(s.shipping_fee, 0) as shipping_fee
           FROM orders o
           JOIN users u ON o.user_id = u.user_id
           LEFT JOIN shipping s ON o.order_id = s.order_id
           WHERE o.order_id = ?`,
          [orderId]
        );

        const [orderItems] = await connection.query(
          `SELECT oi.*, p.name
           FROM order_items oi
           JOIN products p ON oi.product_id = p.product_id
           WHERE oi.order_id = ?`,
          [orderId]
        );

        if (orders.length > 0) {
          const order = orders[0];
          const emailDetails = {
            orderNumber: orderId,
            customerName: `${order.first_name} ${order.last_name}`,
            customerEmail: order.email,
            customerPhone: order.phone,
            items: orderItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price
            })),
            totalAmount: order.total_price,
            shippingFee: order.shipping_fee,
            shippingAddress: order.shipping_address,
            paymentMethod: 'DragonPay',
            paymentReference: refno,
            trackingNumber: order.tracking_number
          };

          // Send confirmation email
          try {
            await sendOrderConfirmationEmail(emailDetails);
            console.log('Order confirmation email sent successfully');
          } catch (emailError) {
            console.error('Failed to send order confirmation email:', emailError);
            // Don't fail the transaction if email fails
          }
        }

        // Create shipping order
        try {
          console.log(`Creating NinjaVan shipping order for order ${orderId}`);
          const shippingResult = await deliveryRouter.createShippingOrder(orderId);
          console.log(`Successfully created NinjaVan shipping with tracking: ${shippingResult.tracking_number}`);

          // Send another email with tracking number if it wasn't included in the first email
          if (orders.length > 0 && shippingResult.tracking_number && !orders[0].tracking_number) {
            const order = orders[0];
            const emailDetails = {
              orderNumber: orderId,
              customerName: `${order.first_name} ${order.last_name}`,
              customerEmail: order.email,
              customerPhone: order.phone,
              items: orderItems.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
              })),
              totalAmount: order.total_price,
              shippingFee: order.shipping_fee,
              shippingAddress: order.shipping_address,
              paymentMethod: 'DragonPay',
              paymentReference: refno,
              trackingNumber: shippingResult.tracking_number
            };

            try {
              await sendOrderConfirmationEmail(emailDetails);
              console.log('Updated order confirmation email sent with tracking number');
            } catch (emailError) {
              console.error('Failed to send updated order confirmation email:', emailError);
            }
          }
        } catch (shippingError) {
          console.error(`Failed to create shipping order for order ${orderId}:`, shippingError);
        }

        await connection.commit();
        return res.send('result=OK');
      } else if (status === 'F') {
        await connection.query(
          'UPDATE orders SET order_status = ? WHERE order_id = ?',
          ['cancelled', orderId]
        );
      } else if (status === 'P') {
        await connection.query(
          'UPDATE orders SET order_status = ? WHERE order_id = ?',
          ['pending', orderId]
        );
      }

      await connection.commit();
      res.send('result=OK');
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Postback processing error:', error);
    res.status(500).send('result=SERVER_ERROR');
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

// Manual test endpoint to simulate Dragonpay postback for local development
router.post('/simulate-payment', async (req, res) => {
  try {
    const { orderId, status = 'S' } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }
    
    console.log(`Simulating payment for order ${orderId} with status ${status}`);
    
    // Get the order to verify it exists
    const [orders] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Get any existing payment for the order
    const [payments] = await db.query('SELECT * FROM payments WHERE order_id = ?', [orderId]);
    
    // Set reference_number and transaction_id
    const txnid = `order_${orderId}_${Date.now()}`;
    const refno = `REF-${orderId}-${Date.now()}`;
    const transactionId = `TXN-${orderId}-${Date.now()}`;
    
    // Update payment status
    if (payments.length > 0) {
      await db.query(
        'UPDATE payments SET status = ?, reference_number = ?, transaction_id = ? WHERE order_id = ?',
        [mapDragonpayStatus(status), refno, transactionId, orderId]
      );
    } else {
      // Create a payment record if none exists
      await db.query(
        'INSERT INTO payments (order_id, user_id, amount, payment_method, status, reference_number, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [orderId, orders[0].user_id, orders[0].total_price, 'dragonpay', mapDragonpayStatus(status), refno, transactionId]
      );
    }
    
    if (status === 'S') {
      // Update order status to for_packing
      await db.query(
        'UPDATE orders SET order_status = ?, payment_status = ? WHERE order_id = ?',
        ['for_packing', 'paid', orderId]
      );
      
      try {
        console.log(`Creating NinjaVan shipping order for order ${orderId}`);
        const shippingResult = await deliveryRouter.createShippingOrder(orderId);
        
        // Return success with created shipping info
        return res.status(200).json({
          message: 'Payment simulation successful and shipping order created',
          order_status: 'for_packing',
          payment_status: 'paid',
          transaction_id: transactionId,
          reference_number: refno,
          shipping: shippingResult
        });
      } catch (shippingError) {
        console.error(`Failed to create shipping order for order ${orderId}:`, shippingError);
        return res.status(200).json({
          message: 'Payment simulation successful but shipping order creation failed',
          order_status: 'for_packing',
          payment_status: 'paid',
          transaction_id: transactionId,
          reference_number: refno,
          error: shippingError.message
        });
      }
    } else if (status === 'F') {
      await db.query(
        'UPDATE orders SET order_status = ? WHERE order_id = ?',
        ['cancelled', orderId]
      );
      
      return res.status(200).json({
        message: 'Payment simulation: Failed payment',
        order_status: 'cancelled',
        payment_status: 'failed',
        transaction_id: transactionId,
        reference_number: refno
      });
    } else if (status === 'P') {
      await db.query(
        'UPDATE orders SET order_status = ? WHERE order_id = ?',
        ['pending', orderId]
      );
      
      return res.status(200).json({
        message: 'Payment simulation: Pending payment',
        order_status: 'pending',
        payment_status: 'pending',
        transaction_id: transactionId,
        reference_number: refno
      });
    } else {
      return res.status(200).json({
        message: `Payment simulation with status: ${status}`,
        order_status: orders[0].order_status,
        payment_status: mapDragonpayStatus(status),
        transaction_id: transactionId,
        reference_number: refno
      });
    }
  } catch (error) {
    console.error('Payment simulation error:', error);
    res.status(500).json({ 
      message: 'Failed to simulate payment',
      error: error.message
    });
  }
});

// Also add a simple endpoint to manually update order status to awaiting_for_confirmation
// This helps test the admin.js confirm-payment endpoint
router.post('/prepare-for-confirmation', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }
    
    // Get the order to verify it exists
    const [orders] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Update order status to processing with awaiting_for_confirmation payment status
    await db.query(
      'UPDATE orders SET order_status = ?, payment_status = ? WHERE order_id = ?',
      ['processing', 'awaiting_for_confirmation', orderId]
    );
    
    // Get any existing payment for the order
    const [payments] = await db.query('SELECT * FROM payments WHERE order_id = ?', [orderId]);
    
    // Update payment status to waiting_for_confirmation
    if (payments.length > 0) {
      await db.query(
        'UPDATE payments SET status = ? WHERE order_id = ?',
        ['waiting_for_confirmation', orderId]
      );
    } else {
      // Create a payment record if none exists
      await db.query(
        'INSERT INTO payments (order_id, user_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?)',
        [orderId, orders[0].user_id, orders[0].total_price, 'dragonpay', 'waiting_for_confirmation']
      );
    }
    
    res.status(200).json({
      message: 'Order prepared for admin confirmation',
      order_id: orderId,
      status: 'processing',
      payment_status: 'awaiting_for_confirmation'
    });
  } catch (error) {
    console.error('Error preparing order for confirmation:', error);
    res.status(500).json({ 
      message: 'Failed to prepare order',
      error: error.message
    });
  }
});

module.exports = router; 