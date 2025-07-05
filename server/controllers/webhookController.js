const enhancedDeliveryService = require('../services/enhancedDeliveryService');
const db = require('../config/db');

async function ninjavanWebhook(req, res) {
  try {
    console.log('Received NinjaVan webhook:', req.body);
    if (!req.body || !req.body.event_type) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }
    await enhancedDeliveryService.processWebhook(req.body);
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
