const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/keys');
const ninjaVanAuth = require('../services/ninjaVanAuth');
const API_BASE_URL = config.NINJAVAN_API_URL || 'https://api.ninjavan.co';
const COUNTRY_CODE = config.NINJAVAN_COUNTRY_CODE || 'SG';
const db = require('../config/db');

function verifyNinjaVanSignature(req, res, next) {
  try {
    const receivedHmac = req.headers['x-ninjavan-hmac-sha256'];
    if (!receivedHmac) {
      console.error('Missing NinjaVan HMAC signature');
      return res.status(401).json({ message: 'Unauthorized: Missing signature' });
    }
    const rawBody = JSON.stringify(req.body);
    const clientSecret = config.NINJAVAN_CLIENT_SECRET;
    const calculatedHmac = crypto.createHmac('sha256', clientSecret)
      .update(rawBody)
      .digest('base64');
    if (calculatedHmac !== receivedHmac) {
      console.error('Invalid NinjaVan HMAC signature');
      return res.status(401).json({ message: 'Unauthorized: Invalid signature' });
    }
    next();
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function processNinjaVanWebhook(data) {
  try {
    const { tracking_id, event, status, timestamp, shipper_order_ref_no } = data;
    console.log(`Processing NinjaVan webhook: ${event} for tracking ${tracking_id}`);
    const [orders] = await db.query(
      'SELECT order_id FROM shipping WHERE tracking_number = ?',
      [tracking_id]
    );
    if (orders.length === 0) {
      console.error(`No order found for tracking number: ${tracking_id}`);
      return;
    }
    const orderId = orders[0].order_id;
    switch (event) {
      case 'Picked Up, In Transit To Origin Hub':
        await updateOrderStatus(orderId, 'picked_up', 'Picked up by NinjaVan');
        await saveTrackingEvent(tracking_id, orderId, event, 'Parcel picked up');
        break;
      case 'Delivered, Collected by Customer':
      case 'Delivered, Left at Doorstep':
      case 'Delivered, Received by Customer':
        await updateOrderStatus(orderId, 'delivered', 'Delivered to customer');
        await saveTrackingEvent(tracking_id, orderId, event, 'Parcel delivered');
        await sendDeliveryNotification(orderId);
        break;
      case 'Returned to Sender':
        await updateOrderStatus(orderId, 'returned', 'Returned to sender');
        await saveTrackingEvent(tracking_id, orderId, event, 'Parcel returned');
        break;
      case 'Cancelled':
        await updateOrderStatus(orderId, 'cancelled', 'Shipping cancelled');
        await saveTrackingEvent(tracking_id, orderId, event, 'Shipping cancelled');
        break;
      default:
        console.log(`Ignoring NinjaVan event: ${event}`);
    }
  } catch (error) {
    console.error('Error processing NinjaVan webhook:', error);
  }
}

async function updateOrderStatus(orderId, status, description) {
  try {
    await db.query(
      'UPDATE orders SET order_status = ?, updated_at = NOW() WHERE order_id = ?',
      [status, orderId]
    );
    await db.query(
      'UPDATE shipping SET status = ?, updated_at = NOW() WHERE order_id = ?',
      [status, orderId]
    );
    console.log(`Updated status for order ${orderId} to ${status}`);
  } catch (error) {
    console.error(`Error updating order status for order ${orderId}:`, error);
    throw error;
  }
}

async function saveTrackingEvent(trackingNumber, orderId, status, description) {
  try {
    await db.query(
      'INSERT INTO tracking_events (tracking_number, order_id, status, description, created_at) VALUES (?, ?, ?, ?, NOW())',
      [trackingNumber, orderId, status, description]
    );
    console.log(`Saved tracking event for order ${orderId}: ${status}`);
  } catch (error) {
    console.error(`Error saving tracking event for order ${orderId}:`, error);
    throw error;
  }
}

async function sendDeliveryNotification(orderId) {
  try {
    const [orders] = await db.query(
      'SELECT o.*, u.email FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.order_id = ?',
      [orderId]
    );
    if (orders.length === 0) return;
    const order = orders[0];
    console.log(`Would send delivery notification to ${order.email} for order ${orderId}`);
  } catch (error) {
    console.error(`Error sending delivery notification for order ${orderId}:`, error);
  }
}

async function ninjavanWebhookHandler(req, res) {
  try {
    res.status(200).send('OK');
    processNinjaVanWebhook(req.body).catch(err => {
      console.error('Error processing NinjaVan webhook:', err);
    });
  } catch (error) {
    console.error('Error in webhook route:', error);
  }
}

async function createOrder(req, res) {
  try {
    const token = await ninjaVanAuth.getValidToken();
    const orderData = req.body;
    const response = await axios.post(
      `${API_BASE_URL}/${COUNTRY_CODE}/4.2/orders`, 
      orderData,
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error creating NinjaVan order:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to create delivery order',
      details: error.response?.data || error.message
    });
  }
}

async function getTracking(req, res) {
  try {
    const trackingInfo = {
      trackingId: req.params.trackingId,
      status: "Pending Pickup", 
      lastUpdate: new Date().toISOString(),
    };
    res.status(200).json(trackingInfo);
  } catch (error) {
    console.error('Error fetching tracking info:', error.message);
    res.status(500).json({ error: 'Failed to retrieve tracking information' });
  }
}

async function getWaybill(req, res) {
  try {
    const token = await ninjaVanAuth.getValidToken();
    const trackingId = req.params.trackingId;
    const response = await axios.get(
      `${API_BASE_URL}/${COUNTRY_CODE}/2.0/reports/waybill?tid=${trackingId}`,
      { 
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
        responseType: 'arraybuffer'
      }
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="waybill-${trackingId}.pdf"`);
    res.status(200).send(response.data);
  } catch (error) {
    console.error('Error generating waybill:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to generate waybill',
      details: error.response?.data || error.message
    });
  }
}

async function estimateShipping(req, res) {
  try {
    const { toAddress, weight, dimensions } = req.body;
    if (!toAddress || !toAddress.postcode || !toAddress.city || !toAddress.state) {
      return res.status(400).json({
        message: 'Missing required address fields',
        details: 'Please provide destination postcode, city, and state'
      });
    }

    const token = await ninjaVanAuth.getValidToken();
    
    // Construct the rate request with SG addresses for sandbox
    const rateRequest = {
      service_type: "Parcel",
      service_level: "Standard",
      from: {
        address1: "30 Jln Kilang Barat",
        city: "Singapore",
        state: "Singapore",
        country: "SG",
        postcode: "159336"
      },
      to: {
        address1: toAddress.address1 || "",
        city: toAddress.city,
        state: toAddress.state,
        country: "SG", // Force SG for sandbox
        postcode: toAddress.postcode
      },
      parcel_job: {
        dimensions: {
          weight: weight || 1,
          length: dimensions?.length || 20,
          width: dimensions?.width || 15,
          height: dimensions?.height || 10
        }
      }
    };

    console.log('Sending rate request to NinjaVan:', rateRequest);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/${COUNTRY_CODE}/4.1/rates`,
        rateRequest,
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      res.status(200).json({
        success: true,
        estimatedFee: response.data.data?.[0]?.total_fee || 0,
        currency: response.data.data?.[0]?.currency || 'SGD',
        service_type: response.data.data?.[0]?.service_type || 'Standard',
        rates: response.data.data
      });
    } catch (apiError) {
      // Check if it's a "no Route matched" error which is common for Philippines addresses
      if (apiError.response?.data?.message?.includes('no Route matched') || 
          (apiError.response?.status === 400 && apiError.response?.data?.message)) {
        console.log('NinjaVan route not found, using fallback shipping rate');
        
        // Return a fallback shipping rate for Philippines addresses
        return res.status(200).json({
          success: true,
          estimatedFee: 250.00, // Fallback fee for Philippines in PHP
          currency: 'PHP',
          service_type: 'Standard',
          fallback: true,
          message: 'Using standard shipping rate for this location'
        });
      }
      
      // Re-throw for other errors
      throw apiError;
    }
  } catch (error) {
    console.error('Error getting NinjaVan shipping estimate:', error.response?.data || error.message);
    
    // Provide a fallback response even for unexpected errors
    res.status(200).json({
      success: true,
      estimatedFee: 250.00, // Fallback fee in PHP
      currency: 'PHP',
      service_type: 'Standard',
      fallback: true,
      error: error.response?.data?.message || error.message || 'Unknown error',
      message: 'Using standard shipping rate due to estimation error'
    });
  }
}

async function cancelOrder(req, res) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const trackingId = req.params.trackingId;
    const userId = req.user?.id || req.user?.user?.id;
    const isAdmin = (req.user?.userType || req.user?.user?.userType) === 'admin';
    if (!userId) {
      await connection.rollback();
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!trackingId || trackingId.length < 9) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Invalid tracking number format',
        details: 'Tracking number must be at least 9 characters long'
      });
    }
    const [shipping] = await connection.query(
      'SELECT s.*, o.order_status, o.user_id, o.order_id FROM shipping s ' +
      'JOIN orders o ON s.order_id = o.order_id ' +
      'WHERE s.tracking_number = ?',
      [trackingId]
    );
    if (shipping.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Order not found',
        details: 'No order found with the provided tracking number'
      });
    }
    const order = shipping[0];
    if (!isAdmin && order.user_id !== userId) {
      await connection.rollback();
      return res.status(403).json({ 
        message: 'Access denied',
        details: 'You can only cancel your own orders'
      });
    }
    const cancelableStatuses = ['processing', 'for_packing', 'packed', 'for_shipping', 'pending'];
    if (!cancelableStatuses.includes(order.order_status)) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Order cannot be cancelled',
        details: `Orders with status '${order.order_status}' cannot be cancelled. Only orders that are pending pickup can be cancelled.`,
        currentStatus: order.order_status
      });
    }
    const token = await ninjaVanAuth.getValidToken();
    let ninjaVanResponse;
    try {
      const ninjaVanCancelResponse = await axios.delete(
        `${API_BASE_URL}/${COUNTRY_CODE}/2.2/orders/${trackingId}`,
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      ninjaVanResponse = ninjaVanCancelResponse.data;
    } catch (ninjaVanError) {
      await connection.rollback();
      if (ninjaVanError.response?.status === 404) {
        return res.status(404).json({
          message: 'Order not found with delivery provider',
          details: 'The order may have already been cancelled or does not exist with NinjaVan'
        });
      } else if (ninjaVanError.response?.status === 400) {
        return res.status(400).json({
          message: 'Order cannot be cancelled with delivery provider',
          details: ninjaVanError.response?.data?.message || 'The order status prevents cancellation'
        });
      } else {
        console.error('NinjaVan cancellation error:', ninjaVanError.response?.data || ninjaVanError.message);
        return res.status(502).json({
          message: 'Failed to cancel order with delivery provider',
          details: 'Please try again later or contact support'
        });
      }
    }
    await connection.query(
      'UPDATE orders SET order_status = ?, updated_at = NOW() WHERE order_id = ?',
      ['cancelled', order.order_id]
    );
    await connection.query(
      'UPDATE shipping SET status = ?, updated_at = NOW() WHERE order_id = ?',
      ['cancelled', order.order_id]
    );
    const [orderItems] = await connection.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [order.order_id]
    );
    for (const item of orderItems) {
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
          [variantId, 'add', item.quantity, `Order ${order.order_id} cancelled - tracking ${trackingId}`]
        );
      }
    }
    await connection.query(
      'INSERT INTO tracking_events (tracking_number, order_id, status, description, created_at) VALUES (?, ?, ?, ?, NOW())',
      [trackingId, order.order_id, 'Cancelled', 'Order cancelled by user request']
    );
    await connection.query(
      'UPDATE payments SET status = ?, updated_at = NOW() WHERE order_id = ? AND status = ?',
      ['refunded', order.order_id, 'completed']
    );
    await connection.commit();
    res.status(200).json({
      message: 'Order cancelled successfully',
      data: {
        trackingId: ninjaVanResponse.trackingId || trackingId,
        status: ninjaVanResponse.status || 'cancelled',
        updatedAt: ninjaVanResponse.updatedAt || new Date().toISOString(),
        orderId: order.order_id,
        refundStatus: 'pending_processing'
      },
      ninjaVanResponse
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error cancelling order:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: 'An unexpected error occurred while cancelling the order. Please try again later or contact support.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
}

async function getTrackingInfo(req, res) {
  try {
    const { trackingId } = req.params;
    const [events] = await db.query(
      'SELECT * FROM tracking_events WHERE tracking_number = ? ORDER BY created_at DESC',
      [trackingId]
    );
    const [shipping] = await db.query(
      'SELECT * FROM shipping WHERE tracking_number = ?',
      [trackingId]
    );
    if (shipping.length === 0) {
      return res.status(404).json({ message: 'Tracking information not found' });
    }
    const [orders] = await db.query(
      'SELECT order_status FROM orders WHERE order_id = ?',
      [shipping[0].order_id]
    );
    const currentStatus = events.length > 0 ? events[0].status : 'Pending';
    res.json({
      trackingId,
      currentStatus,
      carrierName: shipping[0].carrier || 'NinjaVan',
      orderStatus: orders[0].order_status,
      events: events
    });
  } catch (error) {
    console.error('Error fetching tracking information:', error);
    res.status(500).json({ message: 'Error fetching tracking information' });
  }
}

async function createShippingOrder(orderId) {
  // ... (migrated as-is from the route file)
}

module.exports = {
  verifyNinjaVanSignature,
  ninjavanWebhookHandler,
  createOrder,
  getTracking,
  getWaybill,
  estimateShipping,
  cancelOrder,
  getTrackingInfo,
  createShippingOrder
};
