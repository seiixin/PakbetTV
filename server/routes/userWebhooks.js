const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/db');

/**
 * User webhook monitoring endpoints (users can only see their own order webhooks)
 */

// Get webhook events for user's orders only
router.get('/webhooks/my-orders', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Get webhook events only for orders belonging to the authenticated user
    const [events] = await db.query(`
      SELECT 
        w.id,
        w.tracking_id,
        w.event,
        w.status,
        w.timestamp,
        w.failure_reason,
        w.is_terminal,
        o.order_id,
        JSON_EXTRACT(w.raw_payload, '$.shipper_order_ref_no') as order_ref
      FROM ninjavan_webhook_events w
      JOIN shipping s ON w.tracking_id = s.tracking_number
      JOIN orders o ON s.order_id = o.order_id
      WHERE o.user_id = ?
      ORDER BY w.timestamp DESC
      LIMIT ? OFFSET ?
    `, [req.user.user_id, parseInt(limit), parseInt(offset)]);
    
    // Get total count for pagination
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total
      FROM ninjavan_webhook_events w
      JOIN shipping s ON w.tracking_id = s.tracking_number
      JOIN orders o ON s.order_id = o.order_id
      WHERE o.user_id = ?
    `, [req.user.user_id]);
    
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching user webhook events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook events'
    });
  }
});

// Get webhook history for a specific order (only if user owns the order)
router.get('/webhooks/orders/:orderId/history', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Verify user owns this order
    const [orderCheck] = await db.query(`
      SELECT order_id FROM orders WHERE order_id = ? AND user_id = ?
    `, [orderId, req.user.user_id]);
    
    if (orderCheck.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You can only view webhook history for your own orders'
      });
    }
    
    // Get tracking number for the order
    const [shipping] = await db.query(`
      SELECT tracking_number FROM shipping WHERE order_id = ?
    `, [orderId]);
    
    if (shipping.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No shipping info found for this order'
      });
    }
    
    const trackingNumber = shipping[0].tracking_number;
    
    // Get all webhook events for this tracking number
    const [events] = await db.query(`
      SELECT 
        id,
        event,
        status,
        timestamp,
        processed_at,
        failure_reason,
        is_terminal,
        is_rts_leg
      FROM ninjavan_webhook_events 
      WHERE tracking_id = ?
      ORDER BY timestamp ASC
    `, [trackingNumber]);
    
    res.json({
      success: true,
      data: {
        orderId,
        trackingNumber,
        events
      }
    });
    
  } catch (error) {
    console.error('Error fetching order webhook history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order webhook history'
    });
  }
});

module.exports = router;
