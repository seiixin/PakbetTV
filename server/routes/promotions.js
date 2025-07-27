const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const promotionsController = require('../controllers/promotionsController');
const { auth } = require('../middleware/auth');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  next();
};

// Public routes
router.get('/active', promotionsController.getActivePromotions);
router.get('/:code', promotionsController.getPromotionByCode);

// Protected routes (require authentication)
router.post('/validate', [
  auth,
  body('code', 'Promotion code is required').notEmpty().trim(),
  body('order_amount', 'Order amount must be a valid number').optional().isNumeric(),
  body('items', 'Items must be an array').optional().isArray(),
  handleValidationErrors
], promotionsController.validatePromotion);

module.exports = router;
