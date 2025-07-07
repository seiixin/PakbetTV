const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const shippingController = require('../controllers/shippingController');

// Get all shipping addresses for a user
router.get('/addresses', auth, shippingController.getAddresses);

// Add a new shipping address
router.post('/addresses', auth, shippingController.addAddress);

// Set an address as default
router.put('/addresses/:id/default', auth, shippingController.setDefaultAddress);

// Delete an address
router.delete('/addresses/:id', auth, shippingController.deleteAddress);

module.exports = router; 