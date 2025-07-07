/**
 * Webhook routes for delivery services
 */
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// NinjaVan Webhook handler
router.post('/ninjavan', webhookController.ninjavanWebhook);

// Route to simulate a webhook for testing
router.post('/test/ninjavan', webhookController.testNinjavanWebhook);

module.exports = router; 