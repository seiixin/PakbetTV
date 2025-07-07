const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const deliveryController = require('../controllers/deliveryController');

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

// Export the createShippingOrder function for use by other modules
router.createShippingOrder = deliveryController.createShippingOrder;

module.exports = router; 