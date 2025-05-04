/**
 * Webhook routes for delivery services
 */
const express = require('express');
const router = express.Router();
const enhancedDeliveryService = require('../services/enhancedDeliveryService');
const db = require('../config/db');

// NinjaVan Webhook handler
router.post('/ninjavan', async (req, res) => {
  try {
    console.log('Received NinjaVan webhook:', req.body);
    
    // Basic validation
    if (!req.body || !req.body.event_type) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }
    
    // Process webhook
    const result = await enhancedDeliveryService.processWebhook(req.body);
    
    // Return success to NinjaVan
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error processing NinjaVan webhook:', error);
    
    // Always return 200 to NinjaVan even if there's an error
    // This prevents them from retrying the webhook
    res.status(200).json({ 
      status: 'error',
      message: 'Error processing webhook, but accepted'
    });
    
    // Log the error in the database
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
});

// Route to simulate a webhook for testing
router.post('/test/ninjavan', async (req, res) => {
  try {
    const { tracking_number, event_type, order_id } = req.body;
    
    if (!tracking_number || !event_type || !order_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create a simulated webhook payload
    const payload = {
      event_type,
      tracking_number,
      timestamp: new Date().toISOString(),
      description: `Test ${event_type} event`,
      data: {
        order_id
      }
    };
    
    // Process the simulated webhook
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
});

module.exports = router; 