const enhancedDeliveryService = require('../services/enhancedDeliveryService');
const db = require('../config/db');
const { sendOrderDispatchedEmail, sendReviewRequestEmail } = require('../services/emailService');

async function ninjavanWebhook(req, res) {
  try {
    console.log('Received NinjaVan webhook:', req.body);
    if (!req.body || !req.body.event_type) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }
    await enhancedDeliveryService.processWebhook(req.body);

    const eventType = String(req.body.event_type).toLowerCase();
    
    // Handle COD payment collection
    if (eventType.includes('cod_payment_collected') || eventType.includes('cash_collected')) {
      try {
        const trackingNumber = req.body.tracking_number || req.body.data?.tracking_number;
        const collectedAmount = req.body.cash_collected || req.body.data?.cash_collected;
        
        if (trackingNumber) {
          const [orders] = await db.query(
            `SELECT o.order_id, o.total_price, p.payment_id, p.payment_method, p.status as payment_status 
             FROM orders o 
             LEFT JOIN payments p ON o.order_id = p.order_id
             WHERE o.tracking_number = ? AND o.payment_status = 'cod_pending' LIMIT 1`,
            [trackingNumber]
          );

          if (orders.length && orders[0].payment_method === 'cod') {
            // Start a transaction
            const connection = await db.getConnection();
            try {
              await connection.beginTransaction();

              // Update order payment status
              await connection.query(
                'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE order_id = ?',
                ['paid', orders[0].order_id]
              );
              
              // Update payment record
              await connection.query(
                'UPDATE payments SET status = ?, reference_number = ?, updated_at = NOW() WHERE payment_id = ?',
                ['completed', `COD-${trackingNumber}-${Date.now()}`, orders[0].payment_id]
              );

              await connection.commit();
              console.log(`COD payment collected and processed for order ${orders[0].order_id}: ${collectedAmount}`);
            } catch (error) {
              await connection.rollback();
              throw error;
            } finally {
              connection.release();
            }
          }
        }
      } catch (codError) {
        console.error('Error processing COD payment collection:', codError);
        // Log the error but don't fail the webhook
        try {
          await db.query(
            'INSERT INTO webhook_logs (provider, event_type, payload) VALUES (?, ?, ?)',
            ['NinjaVan', 'cod_payment_error', JSON.stringify({
              error: codError.message,
              trackingNumber: req.body.tracking_number,
              data: req.body
            })]
          );
        } catch (logError) {
          console.error('Error logging COD payment error:', logError);
        }
      }
    }

    if (eventType.includes('pickup')) {
      try {
        const trackingNumber = req.body.tracking_number || req.body.data?.tracking_number || req.body.data?.tracking_number || null;

        if (trackingNumber) {
          const [rows] = await db.query(
            `SELECT o.order_id, o.tracking_number, u.first_name, u.last_name, u.email
             FROM orders o JOIN users u ON o.user_id = u.user_id
             WHERE o.tracking_number = ? LIMIT 1`,
            [trackingNumber]
          );

          if (rows.length) {
            const user = rows[0];
            await sendOrderDispatchedEmail({
              customerName: `${user.first_name} ${user.last_name}`.trim(),
              customerEmail: user.email,
              trackingNumber
            });
            console.log(`Dispatched email queued for tracking ${trackingNumber}`);
          } else {
            console.warn(`No order found for tracking ${trackingNumber}, email not sent.`);
          }
        } else {
          console.warn('No tracking number in webhook payload for pickup event.');
        }
      } catch (emailErr) {
        console.error('Error sending dispatched email:', emailErr.message);
      }
    }

    // Send review request on delivered/completed events
    if (eventType.includes('delivered')) {
      try {
        const trackingNumber = req.body.tracking_number || req.body.data?.tracking_number || null;
        if (trackingNumber) {
          const [orders] = await db.query(
            `SELECT o.order_id, o.order_code, u.first_name, u.last_name, u.email
             FROM orders o JOIN users u ON o.user_id = u.user_id
             WHERE o.tracking_number = ? LIMIT 1`,
            [trackingNumber]
          );
          if (orders.length) {
            const order = orders[0];
            // fetch items
            const [items] = await db.query(
              'SELECT oi.product_id, oi.quantity, p.name FROM order_items oi JOIN products p ON oi.product_id = p.product_id WHERE oi.order_id = ?',
              [order.order_id]
            );
            await sendReviewRequestEmail({
              orderNumber: order.order_code || order.order_id,
              customerName: `${order.first_name} ${order.last_name}`.trim(),
              customerEmail: order.email,
              items
            });
            console.log(`Review request email sent for order ${order.order_id}`);
          }
        }
      } catch (err) {
        console.error('Error sending review email:', err.message);
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error processing NinjaVan webhook:', error);
    res.status(200).json({ 
      status: 'error',
      message: 'Error processing webhook, but accepted'
    });
    try {
      await db.query(
        'INSERT INTO webhook_logs (provider, event_type, payload) VALUES (?, ?, ?)',
        ['NinjaVan', req.body?.event_type || 'unknown', JSON.stringify({
          error: error.message,
          payload: req.body
        })]
      );
    } catch (logError) {
      console.error('Error logging webhook error:', logError);
    }
  }
}

async function testNinjavanWebhook(req, res) {
  try {
    const { tracking_number, event_type, order_id } = req.body;
    if (!tracking_number || !event_type || !order_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const payload = {
      event_type,
      tracking_number,
      timestamp: new Date().toISOString(),
      description: `Test ${event_type} event`,
      data: {
        order_id
      }
    };
    const result = await enhancedDeliveryService.processWebhook(payload);
    res.status(200).json({ 
      status: 'success',
      message: 'Test webhook processed successfully',
      result
    });
  } catch (error) {
    console.error('Error processing test webhook:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  ninjavanWebhook,
  testNinjavanWebhook
};
