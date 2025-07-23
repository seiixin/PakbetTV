const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const deliveryController = require('../controllers/deliveryController');

// Unified webhook endpoint for all NinjaVan status updates
router.post('/ninjavan/webhook/unified', express.json({ 
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}), deliveryController.verifyNinjaVanSignature, deliveryController.ninjavanUnifiedWebhookHandler);

// Legacy webhook endpoint (still supported)
router.post('/ninjavan/webhook', express.json({ 
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}), deliveryController.verifyNinjaVanSignature, deliveryController.ninjavanWebhookHandler);

router.post('/ninjavan/create-order', auth, deliveryController.createOrder);
router.get('/ninjavan/tracking/:trackingId', deliveryController.getTracking);
router.get('/ninjavan/waybill/:trackingId', deliveryController.getWaybill);
router.post('/ninjavan/estimate', auth, deliveryController.estimateShipping);
router.delete('/ninjavan/orders/:trackingId', auth, deliveryController.cancelOrder);
router.get('/tracking/:trackingId', deliveryController.getTrackingInfo);

// Admin endpoint to manually process auto-completions
router.post('/admin/process-auto-completions', auth, async (req, res) => {
  try {
    const result = await deliveryController.processAutoCompletions();
    res.json({
      success: true,
      message: 'Auto-completion processing completed',
      ...result
    });
  } catch (error) {
    console.error('Error in manual auto-completion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process auto-completions',
      error: error.message
    });
  }
});

// Export the createShippingOrder function for use by other modules
router.createShippingOrder = deliveryController.createShippingOrder;

module.exports = router;