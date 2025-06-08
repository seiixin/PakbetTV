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

router.post('/orders', auth, async (req, res) => {
  const connection = await db.getConnection();
  console.log('Starting order creation process...');
  console.log('Database connection acquired');
  
  try {
    await connection.beginTransaction();
    console.log('Transaction started');
    
    // Log the incoming order data
    console.log('Order data:', req.body);
    
    const { user_id, total_amount, subtotal, shipping_fee = 0, items } = req.body;
    
    // Generate order_code using UUID
    const orderCode = uuidv4();
    console.log(`Generated order_code: ${orderCode}`);
    
    // Create the order record - let MySQL auto-increment the order_id
    console.log('Creating order record with data:', { user_id, total_amount, subtotal, shipping_fee, order_code: orderCode });
    const [orderResult] = await connection.query(
      `INSERT INTO orders 
       (user_id, total_price, order_status, payment_status, order_code, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [user_id, total_amount, 'processing', 'pending', orderCode]
    );
    
    const orderId = orderResult.insertId; // Use the auto-increment ID
    console.log(`Order record created with ID: ${orderId}, order_code: ${orderCode}`);

    // Create shipping record if shipping fee is provided
    if (shipping_fee > 0) {
      console.log(`Creating shipping record with fee: ${shipping_fee}`);
      await connection.query(
        'INSERT INTO shipping (order_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [orderId, user_id, 'pending']
      );
    }

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
router.post('/payment', auth, async (req, res) => {
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
      const returnUrl = `${process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://pakbettv.gghsoftwaredev.com'}/transaction-complete`;
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
    const { txnId, refNo, status } = req.query;
    console.log('Verifying transaction:', { txnId, refNo, status });

    if (!txnId || !refNo || !status) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Extract order_code from txnId (format: order_{orderCode}_{timestamp})
    const orderCodeMatch = txnId.match(/order_(.+?)_\d+$/);
    if (!orderCodeMatch || !orderCodeMatch[1]) {
      console.error('Invalid transaction ID format:', txnId);
      return res.status(400).json({ message: 'Invalid transaction ID format' });
    }
    const orderCode = orderCodeMatch[1];
    console.log('Extracted order_code:', orderCode);

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Find order by order_code
    const [orders] = await connection.query(
        'SELECT * FROM orders WHERE order_code = ?',
        [orderCode]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orders[0];
      const orderId = order.order_id; // Now this is the auto-increment ID
      console.log('Found order:', { order_id: orderId, order_code: orderCode });

    // Get shipping details
    const [shipping] = await connection.query(
      'SELECT * FROM shipping_details WHERE order_id = ?',
      [orderId]
    );

    // Get user shipping details
    const [userShippingDetails] = await connection.query(
      `SELECT usd.*, u.first_name, u.last_name, u.email, u.phone
       FROM user_shipping_details usd
       JOIN users u ON usd.user_id = u.user_id
       WHERE usd.user_id = ? AND usd.is_default = 1`,
      [order.user_id]
    );

      // If status is success, update order status and payment status
    if (status === 'S') {
      console.log('Payment successful, updating order status');
      
      // Update order status and payment status
      await connection.query(
        'UPDATE orders SET order_status = ?, payment_status = ?, updated_at = NOW() WHERE order_id = ?',
        ['for_packing', 'paid', orderId]
      );

      // Update payment record with completed status
      await connection.query(
        'UPDATE payments SET status = ?, reference_number = ?, updated_at = NOW() WHERE order_id = ?',
        ['completed', refNo, orderId]
      );

      // Empty the user's cart
      await connection.query('DELETE FROM cart WHERE user_id = ?', [order.user_id]);

      // Commit all changes
      await connection.commit();
      console.log('Payment and order status updated successfully');

        // Create shipping order and send confirmation email
        try {
          console.log('Creating shipping order for order:', orderId);
          const shippingResult = await deliveryRouter.createShippingOrder(orderId);
          
          if (shippingResult && shippingResult.tracking_number) {
            // Update orders table with tracking number using a new connection
            const [updateResult] = await db.query(
              'UPDATE orders SET tracking_number = ? WHERE order_id = ?',
              [shippingResult.tracking_number, orderId]
            );
            console.log('Tracking number updated:', shippingResult.tracking_number);
            console.log('Update result:', updateResult);
          }
          
          console.log('Shipping order creation completed');
        } catch (shippingError) {
          // Don't fail the transaction if shipping creation fails
          console.error('Failed to create shipping order (non-critical):', shippingError.message);
        }

        // Send order confirmation email
        try {
          console.log('Sending order confirmation email for order:', orderId);
          
          // Get user details
          const [userDetails] = await db.query(
            'SELECT u.first_name, u.last_name, u.email, u.phone FROM users u ' +
            'WHERE u.user_id = ?',
            [order.user_id]
          );

          // Get order items for email
          const [orderItems] = await db.query(
            'SELECT oi.*, p.name FROM order_items oi ' +
            'JOIN products p ON oi.product_id = p.product_id ' +
            'WHERE oi.order_id = ?',
            [orderId]
          );

          // Get payment details
          const [paymentDetails] = await db.query(
            'SELECT * FROM payments WHERE order_id = ? ORDER BY payment_id DESC LIMIT 1',
            [orderId]
          );

          // Get shipping address
          let shippingAddress = 'Address not available';
          if (shipping.length > 0 && shipping[0].address) {
            shippingAddress = shipping[0].address;
          } else if (userShippingDetails.length > 0) {
            const userShipping = userShippingDetails[0];
            shippingAddress = `${userShipping.address1}, ${userShipping.address2 || ''}, ${userShipping.city}, ${userShipping.state}, ${userShipping.postcode}, ${userShipping.country}`.trim().replace(/, ,/g, ',').replace(/,$/g, '');
          }

          if (userDetails.length > 0) {
            const user = userDetails[0];
            const payment = paymentDetails.length > 0 ? paymentDetails[0] : {};
            
            // Prepare email details
            const emailDetails = {
              orderNumber: order.order_code || orderId,
              customerName: `${user.first_name} ${user.last_name}`,
              customerEmail: user.email,
              customerPhone: user.phone,
              items: orderItems.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
              })),
              totalAmount: order.total_price,
              shippingFee: 0, // Shipping fee not stored in shipping table
              shippingAddress: shippingAddress,
              paymentMethod: payment.payment_method || 'DragonPay',
              paymentReference: refNo,
              trackingNumber: order.tracking_number || null
            };

            // Send the email
            await sendOrderConfirmationEmail(emailDetails);
            console.log('Order confirmation email sent successfully to:', user.email);
          }
        } catch (emailError) {
          // Don't fail the transaction if email fails
          console.error('Failed to send order confirmation email (non-critical):', emailError.message);
        }

    } else if (status === 'F') {
      // Handle failed payment
            await connection.query(
        'UPDATE orders SET order_status = ?, payment_status = ?, updated_at = NOW() WHERE order_id = ?',
        ['cancelled', 'failed', orderId]
            );
            await connection.query(
        'UPDATE payments SET status = ?, reference_number = ?, updated_at = NOW() WHERE order_id = ?',
        ['failed', refNo, orderId]
            );
      await connection.commit();
    } else {
      // Handle pending or other statuses
            await connection.query(
        'UPDATE payments SET status = ?, reference_number = ?, updated_at = NOW() WHERE order_id = ?',
        ['pending', refNo, orderId]
            );
            await connection.commit();
    }

    res.json({
      status: status === 'S' ? 'success' : status === 'F' ? 'failed' : 'pending',
      message: status === 'S' ? 'Payment successful' : status === 'F' ? 'Payment failed' : 'Payment pending',
        order: {
        ...order,
        shipping: shipping.length > 0 ? shipping[0] : null
      }
    });

    } catch (error) {
        await connection.rollback();
      throw error;
  } finally {
        connection.release();
    }

  } catch (error) {
    console.error('Error in verify endpoint:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});
router.post('/postback', async (req, res) => {
  try {
    const { txnid, refno, status, message, digest } = req.body;
    
    console.log('Postback received:', { txnid, refno, status, message });
    
    // Validate digest for security
    const SECRET_KEY = process.env.DRAGONPAY_SECRET_KEY || 'test_key';
    const expectedDigest = crypto.createHash('sha1')
      .update(`${txnid}:${refno}:${status}:${message}:${SECRET_KEY}`)
      .digest('hex');
    
    if (digest && digest.toLowerCase() !== expectedDigest.toLowerCase()) {
      console.error('Invalid digest received from DragonPay');
      return res.status(400).send('result=Invalid digest');
    }
    
    // Extract order_code from txnid (format: order_{orderCode}_{timestamp})
    const orderCodeMatch = txnid.match(/order_(.+?)_\d+$/);
    if (!orderCodeMatch || !orderCodeMatch[1]) {
      console.error('Invalid transaction ID format:', txnid);
      return res.status(400).send('result=Invalid transaction ID');
    }
    const orderCode = orderCodeMatch[1];
    console.log('Postback - Extracted order_code:', orderCode);

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Find order by order_code
      const [orders] = await connection.query(
        'SELECT * FROM orders WHERE order_code = ?',
        [orderCode]
      );

      if (orders.length === 0) {
        await connection.rollback();
        return res.status(400).send('result=Order not found');
      }

      const order = orders[0];
      const orderId = order.order_id; // Auto-increment ID
      console.log('Postback - Found order:', { order_id: orderId, order_code: orderCode });

      if (status === 'S') {
        // Success - Update order status to for_packing and payment status to paid
        await connection.query(
          'UPDATE orders SET order_status = ?, payment_status = ?, updated_at = NOW() WHERE order_id = ?',
          ['for_packing', 'paid', orderId]
        );

        // Update payment record
        await connection.query(
          'UPDATE payments SET status = ?, reference_number = ?, updated_at = NOW() WHERE order_id = ?',
          ['completed', refno, orderId]
        );

        // Empty cart
        await connection.query('DELETE FROM cart WHERE user_id = ?', [order.user_id]);

        console.log(`Postback - Payment successful for order ${orderId}`);

        // Send order confirmation email for successful payment
        try {
          console.log('Postback - Sending order confirmation email for order:', orderId);
          
          // Get user details
          const [userDetails] = await connection.query(
            'SELECT u.first_name, u.last_name, u.email, u.phone FROM users u ' +
            'WHERE u.user_id = ?',
            [order.user_id]
          );

          // Get order items for email
          const [orderItems] = await connection.query(
            'SELECT oi.*, p.name FROM order_items oi ' +
            'JOIN products p ON oi.product_id = p.product_id ' +
            'WHERE oi.order_id = ?',
            [orderId]
          );

          // Get payment details
          const [paymentDetails] = await connection.query(
            'SELECT * FROM payments WHERE order_id = ? ORDER BY payment_id DESC LIMIT 1',
            [orderId]
          );

          // Get shipping details
          const [shippingDetails] = await connection.query(
            'SELECT * FROM shipping WHERE order_id = ?',
            [orderId]
          );

          // Get user shipping details
          const [userShippingDetails] = await connection.query(
            'SELECT * FROM user_shipping_details WHERE user_id = ? AND is_default = 1',
            [order.user_id]
          );

          // Get shipping address
          let shippingAddress = 'Address not available';
          if (shippingDetails.length > 0 && shippingDetails[0].address) {
            shippingAddress = shippingDetails[0].address;
          } else if (userShippingDetails.length > 0) {
            const userShipping = userShippingDetails[0];
            shippingAddress = `${userShipping.address1}, ${userShipping.address2 || ''}, ${userShipping.city}, ${userShipping.state}, ${userShipping.postcode}, ${userShipping.country}`.trim().replace(/, ,/g, ',').replace(/,$/g, '');
          }

          if (userDetails.length > 0) {
            const user = userDetails[0];
            const payment = paymentDetails.length > 0 ? paymentDetails[0] : {};
            
            // Prepare email details
            const emailDetails = {
              orderNumber: order.order_code || orderId,
              customerName: `${user.first_name} ${user.last_name}`,
              customerEmail: user.email,
              customerPhone: user.phone,
              items: orderItems.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
              })),
              totalAmount: order.total_price,
              shippingFee: 0, // Shipping fee not stored in shipping table
              shippingAddress: shippingAddress,
              paymentMethod: payment.payment_method || 'DragonPay',
              paymentReference: refno,
              trackingNumber: order.tracking_number || null
            };

            // Send the email
            await sendOrderConfirmationEmail(emailDetails);
            console.log('Postback - Order confirmation email sent successfully to:', user.email);
          }
        } catch (emailError) {
          // Don't fail the transaction if email fails
          console.error('Postback - Failed to send order confirmation email (non-critical):', emailError.message);
        }

      } else if (status === 'F') {
        // Failed - Update order status to cancelled and payment status to failed
        await connection.query(
          'UPDATE orders SET order_status = ?, payment_status = ?, updated_at = NOW() WHERE order_id = ?',
          ['cancelled', 'failed', orderId]
        );

        await connection.query(
          'UPDATE payments SET status = ?, reference_number = ?, updated_at = NOW() WHERE order_id = ?',
          ['failed', refno, orderId]
        );

        console.log(`Postback - Payment failed for order ${orderId}`);
        
      } else if (status === 'P') {
        // Pending - Important for OTC payments which start as pending
        await connection.query(
          'UPDATE orders SET order_status = ?, payment_status = ?, updated_at = NOW() WHERE order_id = ?',
          ['processing', 'awaiting_for_confirmation', orderId]
        );

        await connection.query(
          'UPDATE payments SET status = ?, reference_number = ?, updated_at = NOW() WHERE order_id = ?',
          ['waiting_for_confirmation', refno, orderId]
        );

        console.log(`Postback - Payment pending for order ${orderId}, waiting for confirmation`);
        
      } else {
        // Handle other status codes (U, R, K, V, A)
        console.log(`Postback - Unhandled status '${status}' for order ${orderId}`);
        
        await connection.query(
          'UPDATE payments SET status = ?, reference_number = ?, updated_at = NOW() WHERE order_id = ?',
          [mapDragonpayStatus(status), refno, orderId]
        );
      }

      await connection.commit();
      
      // DragonPay expects this exact response format
      res.status(200).send('result=OK');

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Postback error:', error);
    // DragonPay expects this exact error response format
    res.status(500).send('result=Error');
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
      
      // Send order confirmation email for simulated successful payment
      try {
        console.log('Simulate-payment - Sending order confirmation email for order:', orderId);
        
        // Get user details
        const [userDetails] = await db.query(
          'SELECT u.first_name, u.last_name, u.email, u.phone FROM users u ' +
          'WHERE u.user_id = ?',
          [orders[0].user_id]
        );

        // Get order items for email
        const [orderItems] = await db.query(
          'SELECT oi.*, p.name FROM order_items oi ' +
          'JOIN products p ON oi.product_id = p.product_id ' +
          'WHERE oi.order_id = ?',
          [orderId]
        );

        // Get shipping details
        const [shippingDetails] = await db.query(
          'SELECT * FROM shipping WHERE order_id = ?',
          [orderId]
        );

        // Get user shipping details
        const [userShippingDetails] = await db.query(
          'SELECT * FROM user_shipping_details WHERE user_id = ? AND is_default = 1',
          [orders[0].user_id]
        );

        // Get shipping address
        let shippingAddress = 'Address not available';
        if (shippingDetails.length > 0 && shippingDetails[0].address) {
          shippingAddress = shippingDetails[0].address;
        } else if (userShippingDetails.length > 0) {
          const userShipping = userShippingDetails[0];
          shippingAddress = `${userShipping.address1}, ${userShipping.address2 || ''}, ${userShipping.city}, ${userShipping.state}, ${userShipping.postcode}, ${userShipping.country}`.trim().replace(/, ,/g, ',').replace(/,$/g, '');
        }

        if (userDetails.length > 0) {
          const user = userDetails[0];
          
          // Prepare email details
          const emailDetails = {
            orderNumber: orders[0].order_code || orderId,
            customerName: `${user.first_name} ${user.last_name}`,
            customerEmail: user.email,
            customerPhone: user.phone,
            items: orderItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price
            })),
            totalAmount: orders[0].total_price,
            shippingFee: 0, // Shipping fee not stored in shipping table
            shippingAddress: shippingAddress,
            paymentMethod: 'DragonPay (Simulated)',
            paymentReference: refno,
            trackingNumber: orders[0].tracking_number || null
          };

          // Send the email
          await sendOrderConfirmationEmail(emailDetails);
          console.log('Simulate-payment - Order confirmation email sent successfully to:', user.email);
        }
      } catch (emailError) {
        // Don't fail the transaction if email fails
        console.error('Simulate-payment - Failed to send order confirmation email (non-critical):', emailError.message);
      }
      
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

// Test endpoint to verify postback URL is accessible and working
router.post('/test-postback', (req, res) => {
  console.log('Test postback received:', req.body);
  console.log('Headers:', req.headers);
  console.log('IP:', req.ip);
  
  res.status(200).send('result=OK');
});

// Test endpoint to check if server is receiving DragonPay requests properly
router.get('/test-postback', (req, res) => {
  console.log('Test GET postback received:', req.query);
  console.log('Headers:', req.headers);
  console.log('IP:', req.ip);
  
  res.status(200).json({
    message: 'Postback URL is accessible',
    timestamp: new Date().toISOString(),
    received_data: {
      query: req.query,
      headers: req.headers,
      ip: req.ip
    }
  });
});

module.exports = router; 