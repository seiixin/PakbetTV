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
    
    const { user_id, total_amount, items } = req.body;
    
    // Generate order_code using UUID
    const orderCode = uuidv4();
    console.log(`Generated order_code: ${orderCode}`);
    
    // Create the order record using order_code as order_id
    console.log('Creating order record with data:', { user_id, total_amount, order_code: orderCode });
    const [orderResult] = await connection.query(
      `INSERT INTO orders 
       (order_id, user_id, total_price, order_status, payment_status, order_code, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [orderCode, user_id, total_amount, 'processing', 'pending', orderCode]
    );
    
    const orderId = orderCode;
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
router.get('/verify', auth, async (req, res) => {
  let connection;
  try {
    const { txnId, refNo, status } = req.query;
    console.log('Verifying transaction:', { txnId, refNo, status });

    if (!txnId && !refNo) {
      return res.status(400).json({ message: 'Transaction ID or reference number is required' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Get payment and order details
    const [payments] = await connection.query(
      'SELECT p.*, o.user_id, o.order_status, o.payment_status FROM payments p JOIN orders o ON p.order_id = o.order_id WHERE p.reference_number = ?',
      [txnId || refNo]
    );

    if (payments.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = payments[0];
    const orderId = payment.order_id;

    // Get order details
    const [orders] = await connection.query(
      'SELECT o.*, s.address as shipping_address FROM orders o LEFT JOIN shipping s ON o.order_id = s.order_id WHERE o.order_id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orders[0];

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

    // If status is success, update order status and subtract stock
    if (status === 'S') {
      console.log('Payment successful, updating order status');
      
      // For DragonPay payments, stock is already deducted during order creation
      // So we only need to update the order status, not deduct stock again
      console.log('Skipping stock deduction as it was already done during order creation');
      
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
          // Update orders table with tracking number
          await db.query(
            'UPDATE orders SET tracking_number = ? WHERE order_id = ?',
            [shippingResult.tracking_number, orderId]
          );
          console.log('Tracking number updated:', shippingResult.tracking_number);
        }
        
        console.log('Shipping order creation completed');
      } catch (shippingError) {
        // Don't fail the transaction if shipping creation fails
        console.error('Failed to create shipping order (non-critical):', shippingError.message);
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

  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error verifying transaction:', err);
    res.status(500).json({ message: 'Server error during verification' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});
router.post('/postback', async (req, res) => {
  try {
    const { txnid, refno, status, message, digest } = req.body;
    
    // Extract order_id from txnid
    const orderId = txnid.split('order_')[1].split('_')[0];
    if (!orderId) {
      console.error('Invalid transaction ID format:', txnid);
      return res.status(400).send('result=Invalid transaction ID');
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get order details to get user_id
      const [orders] = await connection.query(
        `SELECT o.*, p.reference_number, p.status AS payment_status,
         s.address as shipping_address, s.tracking_number
         FROM orders o 
         LEFT JOIN payments p ON o.order_id = p.order_id 
         LEFT JOIN shipping s ON o.order_id = s.order_id
         WHERE o.order_id = ?`,
        [orderId]
      );

      if (orders.length === 0) {
        await connection.rollback();
        return res.status(404).send('result=Order not found');
      }

      const order = orders[0];
      console.log('Found order:', orderId, 'User ID:', order.user_id);

      // Get user shipping details
      const [userShippingDetails] = await connection.query(
        `SELECT usd.*, u.first_name, u.last_name, u.email, u.phone
         FROM user_shipping_details usd
         JOIN users u ON usd.user_id = u.user_id
         WHERE usd.user_id = ? AND usd.is_default = 1
         ORDER BY usd.created_at DESC LIMIT 1`,
        [order.user_id]
      );

      if (!userShippingDetails.length) {
        console.error('No default user shipping details found for user:', order.user_id);
        
        // Try to get any shipping details, even if not default
        const [anyShippingDetails] = await connection.query(
          `SELECT usd.*, u.first_name, u.last_name, u.email, u.phone
           FROM user_shipping_details usd
           JOIN users u ON usd.user_id = u.user_id
           WHERE usd.user_id = ?
           ORDER BY usd.created_at DESC LIMIT 1`,
          [order.user_id]
        );
        
        if (!anyShippingDetails.length) {
          console.error('No shipping details found for user at all');
          await connection.rollback();
          return res.status(400).send('result=No shipping details');
        }
        
        console.log('Found non-default shipping details', anyShippingDetails[0]);
        var shipping = anyShippingDetails[0];
      } else {
        console.log('Found default shipping details:', userShippingDetails[0]);
        var shipping = userShippingDetails[0];
      }

      // Update payment status
      await connection.query(
        'UPDATE payments SET status = ?, reference_number = ? WHERE order_id = ?',
        [mapDragonpayStatus(status), refno, orderId]
      );

      if (status === 'S') {
        // Update order status
        await connection.query(
          'UPDATE orders SET order_status = ?, payment_status = ?, updated_at = NOW() WHERE order_id = ?',
          ['for_packing', 'paid', orderId]
        );

        // Create or update shipping record with complete address
        const addressParts = [];
        if (shipping.house_number) addressParts.push(`Block ${shipping.house_number}`);
        if (shipping.street_name) addressParts.push(shipping.street_name);
        if (shipping.building) addressParts.push(shipping.building);
        if (shipping.barangay) addressParts.push(shipping.barangay);
        if (shipping.city_municipality) addressParts.push(shipping.city_municipality);
        if (shipping.province) addressParts.push(shipping.province);
        if (shipping.region) addressParts.push(shipping.region);
        if (shipping.postcode) addressParts.push(shipping.postcode);
        if (shipping.country) addressParts.push(shipping.country);

        const fullAddress = addressParts.join(', ');
        console.log('Constructed shipping address:', fullAddress);

        if (!fullAddress) {
          console.error('Could not construct valid shipping address from details:', shipping);
          await connection.rollback();
          return res.status(400).json({ message: 'Could not construct valid shipping address' });
        }

        console.log('Creating/updating shipping record with address:', fullAddress);

        const [existingShipping] = await connection.query(
          'SELECT * FROM shipping WHERE order_id = ?',
          [orderId]
        );

        if (existingShipping.length === 0) {
          // Create new shipping record
          await connection.query(
            'INSERT INTO shipping (order_id, user_id, address, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [orderId, order.user_id, fullAddress, 'pending']
          );
        } else {
          // Update existing shipping record
          await connection.query(
            'UPDATE shipping SET address = ?, updated_at = NOW() WHERE order_id = ?',
            [fullAddress, orderId]
          );
        }

        // Create or update shipping_details record
        const [existingShippingDetails] = await connection.query(
          'SELECT * FROM shipping_details WHERE order_id = ?',
          [orderId]
        );

        if (existingShippingDetails.length === 0) {
          // Create new shipping_details record
          await connection.query(
            `INSERT INTO shipping_details (
              order_id, address1, address2, area, city, state, postcode, country,
              region, province, city_municipality, barangay, house_number, building, street_name,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              orderId,
              shipping.address1 || '',
              shipping.address2 || '',
              shipping.area || '',
              shipping.city_municipality || shipping.city || '',
              shipping.province || shipping.state || '',
              shipping.postcode || '',
              shipping.country || 'PH',
              shipping.region || '',
              shipping.province || '',
              shipping.city_municipality || '',
              shipping.barangay || '',
              shipping.house_number || '',
              shipping.building || '',
              shipping.street_name || ''
            ]
          );
        } else {
          // Update existing shipping_details record
          await connection.query(
            `UPDATE shipping_details SET
              address1 = ?, address2 = ?, area = ?, city = ?, state = ?, postcode = ?, country = ?,
              region = ?, province = ?, city_municipality = ?, barangay = ?, house_number = ?,
              building = ?, street_name = ?, updated_at = NOW()
            WHERE order_id = ?`,
            [
              shipping.address1 || '',
              shipping.address2 || '',
              shipping.area || '',
              shipping.city_municipality || shipping.city || '',
              shipping.province || shipping.state || '',
              shipping.postcode || '',
              shipping.country || 'PH',
              shipping.region || '',
              shipping.province || '',
              shipping.city_municipality || '',
              shipping.barangay || '',
              shipping.house_number || '',
              shipping.building || '',
              shipping.street_name || '',
              orderId
            ]
          );
        }

        // Create NinjaVan shipping order
        try {
          console.log('Creating NinjaVan shipping order with details:', {
            orderId,
            address: fullAddress,
            customerName: `${shipping.first_name} ${shipping.last_name}`,
            customerEmail: shipping.email,
            customerPhone: shipping.phone
          });

          const shippingResult = await deliveryRouter.createShippingOrder(orderId);
          
          if (shippingResult && shippingResult.tracking_number) {
            // Update shipping tracking number
            await connection.query(
              'UPDATE shipping SET tracking_number = ?, status = ?, updated_at = NOW() WHERE order_id = ?',
              [shippingResult.tracking_number, 'pending', orderId]
            );

            // Update orders table tracking number
            await connection.query(
              'UPDATE orders SET tracking_number = ? WHERE order_id = ?',
              [shippingResult.tracking_number, orderId]
            );

            // Create tracking event
            await connection.query(
              'INSERT INTO tracking_events (tracking_number, order_id, status, description, created_at) VALUES (?, ?, ?, ?, NOW())',
              [shippingResult.tracking_number, orderId, 'pending', 'Shipping order created']
            );

            // Send confirmation email
            const emailDetails = {
              orderNumber: orderId,
              customerName: `${shipping.first_name} ${shipping.last_name}`,
              customerEmail: shipping.email,
              customerPhone: shipping.phone,
              totalAmount: order.total_price,
              shippingAddress: fullAddress,
              paymentMethod: 'DragonPay',
              paymentReference: refno,
              trackingNumber: shippingResult.tracking_number
            };

            try {
              await sendOrderConfirmationEmail(emailDetails);
              console.log('Order confirmation email sent with tracking number');
            } catch (emailError) {
              console.error('Failed to send order confirmation email:', emailError);
            }
          } else {
            console.error('No tracking number received from NinjaVan');
          }
        } catch (shippingError) {
          console.error('Failed to create shipping order:', shippingError);
          // Log detailed error for debugging
          console.error('Shipping error details:', {
            error: shippingError.message,
            stack: shippingError.stack,
            orderId,
            address: fullAddress
          });
        }

        await connection.commit();
        return res.send('result=OK');
      } else {
        // For non-success statuses, just update the payment status
        await connection.commit();
        return res.send('result=OK');
      }
    } catch (error) {
      await connection.rollback();
      console.error('Transaction error:', error);
      return res.status(500).send('result=Error');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Postback error:', error);
    return res.status(500).send('result=Error');
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