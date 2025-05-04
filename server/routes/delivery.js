const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/keys');
const API_BASE_URL = config.NINJAVAN_API_URL || 'https://api.ninjavan.co';
const COUNTRY_CODE = config.NINJAVAN_COUNTRY_CODE || 'SG';
const CLIENT_ID = config.NINJAVAN_CLIENT_ID;
const CLIENT_SECRET = config.NINJAVAN_CLIENT_SECRET;
const db = require('../config/db');

async function getNinjaVanToken() {
  try {
    const response = await axios.post(`${API_BASE_URL}/${COUNTRY_CODE}/2.0/oauth/access_token`, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials"
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting NinjaVan access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with NinjaVan');
  }
}

// Middleware to verify NinjaVan webhook signatures
const verifyNinjaVanSignature = (req, res, next) => {
  try {
    const receivedHmac = req.headers['x-ninjavan-hmac-sha256'];
    if (!receivedHmac) {
      console.error('Missing NinjaVan HMAC signature');
      return res.status(401).json({ message: 'Unauthorized: Missing signature' });
    }

    // Get the raw request body as a string
    const rawBody = JSON.stringify(req.body);
    
    // Calculate HMAC using your CLIENT_SECRET
    const clientSecret = config.NINJAVAN_CLIENT_SECRET;
    const calculatedHmac = crypto.createHmac('sha256', clientSecret)
      .update(rawBody)
      .digest('base64');
    
    // Compare signatures
    if (calculatedHmac !== receivedHmac) {
      console.error('Invalid NinjaVan HMAC signature');
      return res.status(401).json({ message: 'Unauthorized: Invalid signature' });
    }
    
    next();
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// NinjaVan webhook endpoint
router.post('/ninjavan/webhook', express.json({ 
  verify: (req, res, buf) => {
    // Store raw body for HMAC verification
    req.rawBody = buf;
  }
}), verifyNinjaVanSignature, async (req, res) => {
  try {
    // Quickly respond with 200 OK to acknowledge receipt of the webhook
    // This is important to prevent NinjaVan from retrying
    res.status(200).send('OK');
    
    // Process the webhook asynchronously
    processNinjaVanWebhook(req.body).catch(err => {
      console.error('Error processing NinjaVan webhook:', err);
    });
  } catch (error) {
    console.error('Error in webhook route:', error);
    // Already sent response, no need to send error
  }
});

// Async function to process webhooks
async function processNinjaVanWebhook(data) {
  try {
    const { 
      tracking_id, 
      event, 
      status, 
      timestamp,
      shipper_order_ref_no
    } = data;
    
    console.log(`Processing NinjaVan webhook: ${event} for tracking ${tracking_id}`);
    
    // Find the order associated with this tracking number
    const [orders] = await db.query(
      'SELECT order_id FROM shipping WHERE tracking_number = ?',
      [tracking_id]
    );
    
    if (orders.length === 0) {
      console.error(`No order found for tracking number: ${tracking_id}`);
      return;
    }
    
    const orderId = orders[0].order_id;
    
    // Only process the events we're interested in
    switch (event) {
      // Pickup events
      case 'Picked Up, In Transit To Origin Hub':
        await updateOrderStatus(orderId, 'picked_up', 'Picked up by NinjaVan');
        await saveTrackingEvent(tracking_id, orderId, event, 'Parcel picked up');
        break;
        
      // Delivery events
      case 'Delivered, Collected by Customer':
      case 'Delivered, Left at Doorstep':
      case 'Delivered, Received by Customer':
        await updateOrderStatus(orderId, 'delivered', 'Delivered to customer');
        await saveTrackingEvent(tracking_id, orderId, event, 'Parcel delivered');
        
        // Optionally send a delivery notification to customer
        await sendDeliveryNotification(orderId);
        break;
        
      // Return events
      case 'Returned to Sender':
        await updateOrderStatus(orderId, 'returned', 'Returned to sender');
        await saveTrackingEvent(tracking_id, orderId, event, 'Parcel returned');
        break;
        
      // Cancellation
      case 'Cancelled':
        await updateOrderStatus(orderId, 'cancelled', 'Shipping cancelled');
        await saveTrackingEvent(tracking_id, orderId, event, 'Shipping cancelled');
        break;
        
      default:
        // Ignore all other events
        console.log(`Ignoring NinjaVan event: ${event}`);
    }
  } catch (error) {
    console.error('Error processing NinjaVan webhook:', error);
  }
}

// Update order status in database
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

// Save tracking event in database
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

// Optional: Send a notification to customer about delivery
async function sendDeliveryNotification(orderId) {
  try {
    // Get customer info
    const [orders] = await db.query(
      'SELECT o.*, u.email FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.order_id = ?',
      [orderId]
    );
    
    if (orders.length === 0) return;
    
    const order = orders[0];
    
    // In a real implementation, you would send an email or notification here
    console.log(`Would send delivery notification to ${order.email} for order ${orderId}`);
  } catch (error) {
    console.error(`Error sending delivery notification for order ${orderId}:`, error);
  }
}

router.post('/ninjavan/create-order', async (req, res) => {
  try {
    const token = await getNinjaVanToken();
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
});

router.get('/ninjavan/tracking/:trackingId', async (req, res) => {
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
});

router.get('/ninjavan/waybill/:trackingId', async (req, res) => {
  try {
    const token = await getNinjaVanToken();
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
});

router.delete('/ninjavan/orders/:trackingId', async (req, res) => {
  try {
    const token = await getNinjaVanToken();
    const trackingId = req.params.trackingId;
    const response = await axios.delete(
      `${API_BASE_URL}/${COUNTRY_CODE}/2.2/orders/${trackingId}`,
      { 
        headers: { 
          'Authorization': `Bearer ${token}` 
        } 
      }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error cancelling order:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to cancel delivery order',
      details: error.response?.data || error.message
    });
  }
});

// Get tracking information
router.get('/tracking/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    // Get the latest events for this tracking number
    const [events] = await db.query(
      'SELECT * FROM tracking_events WHERE tracking_number = ? ORDER BY created_at DESC',
      [trackingId]
    );
    
    // Get the shipping details
    const [shipping] = await db.query(
      'SELECT * FROM shipping WHERE tracking_number = ?',
      [trackingId]
    );
    
    if (shipping.length === 0) {
      return res.status(404).json({ message: 'Tracking information not found' });
    }
    
    // Get the order details
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
});

module.exports = router; 