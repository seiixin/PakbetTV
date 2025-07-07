const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');

router.post('/dragonpay-callback', paymentsController.dragonpayCallback);

module.exports = router; 