const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const reviewsController = require('../controllers/reviewsController');

router.post('/product/:productId', auth, [
  body('rating', 'Rating must be between 1 and 5').isInt({ min: 1, max: 5 }),
  body('review_text', 'Review text cannot be empty').optional().notEmpty()
], reviewsController.createReview);

router.get('/product/:productId', reviewsController.getProductReviews);

router.put('/:reviewId', auth, [
  body('rating', 'Rating must be between 1 and 5').optional().isInt({ min: 1, max: 5 }),
  body('review_text', 'Review text cannot be empty').optional().notEmpty()
], reviewsController.updateReview);

router.delete('/:reviewId', auth, reviewsController.deleteReview);

module.exports = router; 