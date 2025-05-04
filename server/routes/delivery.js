const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/db');
const ninjaVanService = require('../services/ninjaVanService');

// Create a NinjaVan delivery order
router.post('/ninjavan/create-order', auth, async (req, res) => {
  try {
    const orderData = req.body;
    
    // Validate required fields
    if (!orderData.order_id && !orderData.reference) {
      return res.status(400).json({ error: 'Missing order information' });
    }
    
    // Get customer info from the database if not provided
    let customerInfo = orderData.customer;
    if (!customerInfo && orderData.order_id) {
      const [users] = await db.query(
        'SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone FROM users u ' +
        'JOIN orders o ON u.user_id = o.user_id WHERE o.order_id = ?',
        [orderData.order_id]
      );
      
      if (users.length > 0) {
        customerInfo = users[0];
      }
    }
    
    // Get shipping address if not provided
    let shippingAddress = orderData.shipping_address;
    if (!shippingAddress && orderData.order_id) {
      const [addresses] = await db.query(
        'SELECT address FROM shipping WHERE order_id = ?',
        [orderData.order_id]
      );
      
      if (addresses.length > 0) {
        shippingAddress = addresses[0].address;
      }
    }
    
    // Create delivery
    const result = await ninjaVanService.createDeliveryOrder(orderData, shippingAddress, customerInfo);
    
    // Update database with tracking information if order_id is provided
    if (orderData.order_id && result.tracking_number) {
      await db.query(
        'UPDATE shipping SET tracking_number = ?, carrier = ? WHERE order_id = ?',
        [result.tracking_number, 'NinjaVan', orderData.order_id]
      );
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error creating NinjaVan order:', error.message);
    res.status(500).json({ 
      error: 'Failed to create delivery order',
      details: error.message
    });
  }
});

// Get tracking info for a delivery
router.get('/ninjavan/tracking/:trackingId', async (req, res) => {
  try {
    const trackingId = req.params.trackingId;
    
    if (!trackingId) {
      return res.status(400).json({ error: 'Tracking ID is required' });
    }
    
    try {
      // Try to get real tracking info from API
      const trackingInfo = await ninjaVanService.getTrackingInfo(trackingId);
      res.status(200).json(trackingInfo);
    } catch (apiError) {
      // Fallback to mock data if API fails
      console.warn('Using mock tracking data due to API error:', apiError.message);
      const mockTrackingInfo = {
        trackingId: trackingId,
        status: "Pending Pickup", 
        lastUpdate: new Date().toISOString(),
        events: [
          {
            timestamp: new Date().toISOString(),
            status: "Order Received",
            description: "Order has been received by NinjaVan"
          }
        ]
      };
      res.status(200).json(mockTrackingInfo);
    }
  } catch (error) {
    console.error('Error fetching tracking info:', error.message);
    res.status(500).json({ error: 'Failed to retrieve tracking information' });
  }
});

// Cancel a delivery order
router.delete('/ninjavan/orders/:trackingId', auth, async (req, res) => {
  try {
    const trackingId = req.params.trackingId;
    
    if (!trackingId) {
      return res.status(400).json({ error: 'Tracking ID is required' });
    }
    
    const result = await ninjaVanService.cancelDelivery(trackingId);
    
    // Find order by tracking number and update status if needed
    const [orders] = await db.query(
      'SELECT o.order_id FROM orders o JOIN shipping s ON o.order_id = s.order_id ' +
      'WHERE s.tracking_number = ?',
      [trackingId]
    );
    
    if (orders.length > 0) {
      const orderId = orders[0].order_id;
      await db.query(
        'UPDATE shipping SET status = ? WHERE order_id = ?',
        ['cancelled', orderId]
      );
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error cancelling order:', error.message);
    res.status(500).json({ 
      error: 'Failed to cancel delivery order',
      details: error.message
    });
  }
});

// Webhook endpoint for NinjaVan delivery updates
router.post('/ninjavan/webhooks', express.json(), async (req, res) => {
  try {
    // In a production environment, verify webhook signatures
    // Store the webhook data for auditing
    await db.query(
      'INSERT INTO webhook_logs (provider, event_type, payload) VALUES (?, ?, ?)',
      ['NinjaVan', req.body.event || 'unknown', JSON.stringify(req.body)]
    );
    
    const trackingData = req.body;
    const trackingId = trackingData.tracking_id || trackingData.tracking_number;
    const status = trackingData.status;
    
    if (trackingId) {
      // Find associated order
      const [orders] = await db.query(
        'SELECT o.order_id FROM orders o JOIN shipping s ON o.order_id = s.order_id ' +
        'WHERE s.tracking_number = ?',
        [trackingId]
      );
      
      if (orders.length > 0) {
        const orderId = orders[0].order_id;
        
        // Map NinjaVan status to your system's statuses
        let orderStatus = null;
        let shippingStatus = null;
        
        switch (status) {
          case 'Pickup Complete':
            orderStatus = 'for_shipping';
            shippingStatus = 'picked_up';
            break;
          case 'Delivery Complete':
            orderStatus = 'delivered';
            shippingStatus = 'delivered';
            break;
          // Add more mappings as needed
        }
        
        // Update order and shipping status if we have a mapping
        if (orderStatus) {
          await db.query(
            'UPDATE orders SET order_status = ? WHERE order_id = ?',
            [orderStatus, orderId]
          );
        }
        
        if (shippingStatus) {
          await db.query(
            'UPDATE shipping SET status = ? WHERE order_id = ?',
            [shippingStatus, orderId]
          );
        }
        
        // Log tracking event
        await db.query(
          'INSERT INTO tracking_events (tracking_number, status, description, created_at) VALUES (?, ?, ?, NOW())',
          [trackingId, status, trackingData.description || status]
        );
      }
    }
    
    return res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Error processing webhook:', error.message);
    return res.status(500).send('Error processing webhook');
  }
});

module.exports = router; 