const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// Helper function to update product rating
const updateProductRating = async (productId) => {
  try {
    const [ratingResult] = await db.query(
      'SELECT AVG(rating) as average_rating, COUNT(*) as review_count FROM reviews WHERE product_id = ?',
      [productId]
    );
    
    const average_rating = ratingResult[0].average_rating || null;
    const review_count = ratingResult[0].review_count || 0;
    
    await db.query(
      'UPDATE products SET average_rating = ?, review_count = ? WHERE product_id = ?',
      [average_rating, review_count, productId]
    );
    console.log(`Updated ratings for product ${productId}: Avg ${average_rating}, Count ${review_count}`);
  } catch (error) {
    console.error(`Failed to update rating for product ${productId}:`, error);
    // Don't throw error here, as it might interrupt the main request flow
  }
};

// @route   POST /api/reviews/product/:productId
// @desc    Create a new review for a product
// @access  Private
router.post('/product/:productId', 
  auth, 
  [
    body('rating', 'Rating must be between 1 and 5').isInt({ min: 1, max: 5 }),
    body('review_text', 'Review text cannot be empty').optional().notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const productId = req.params.productId;
    const userId = req.user?.user?.id;
    const { rating, review_text } = req.body;

    if (!userId) {
        console.error('Auth Error: User ID not found in token payload', req.user);
        return res.status(401).json({ message: 'Could not identify user from token' });
    }

    try {
      const [products] = await db.query('SELECT product_id FROM products WHERE product_id = ?', [productId]);
      if (products.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check if user has already reviewed this product
      const [existingReviews] = await db.query(
        'SELECT review_id FROM reviews WHERE product_id = ? AND user_id = ?',
        [productId, userId]
      );
      
      if (existingReviews.length > 0) {
        // Prevent submitting another review
        return res.status(400).json({ message: 'You have already reviewed this product' });
      } else {
        // Insert new review
        const [result] = await db.query(
          'INSERT INTO reviews (product_id, user_id, rating, review_text) VALUES (?, ?, ?, ?)',
          [productId, userId, rating, review_text || null]
        );
        
        // Update product's average rating and review count
        await updateProductRating(productId);

        res.status(201).json({ 
            message: 'Review created successfully', 
            review_id: result.insertId 
        });
      }

    } catch (err) {
      console.error('Error creating review:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/reviews/product/:productId
// @desc    Get all reviews for a specific product
// @access  Public
router.get('/product/:productId', async (req, res) => {
  const productId = req.params.productId;
  try {
    const [reviews] = await db.query(
      `SELECT r.*, u.username 
       FROM reviews r 
       JOIN users u ON r.user_id = u.user_id 
       WHERE r.product_id = ? 
       ORDER BY r.created_at DESC`,
      [productId]
    );
    res.json(reviews);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/reviews/:reviewId
// @desc    Update an existing review
// @access  Private
router.put('/:reviewId', 
  auth, 
  [
    body('rating', 'Rating must be between 1 and 5').optional().isInt({ min: 1, max: 5 }),
    body('review_text', 'Review text cannot be empty').optional().notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const reviewId = req.params.reviewId;
    const userId = req.user.user_id;
    const { rating, review_text } = req.body;

    try {
      // Find the review and verify ownership
      const [reviews] = await db.query('SELECT * FROM reviews WHERE review_id = ?', [reviewId]);
      if (reviews.length === 0) {
        return res.status(404).json({ message: 'Review not found' });
      }
      const review = reviews[0];

      if (review.user_id !== userId) {
        return res.status(403).json({ message: 'User not authorized to update this review' });
      }

      // Prepare update fields
      const updateFields = {};
      if (rating !== undefined) updateFields.rating = rating;
      if (review_text !== undefined) updateFields.review_text = review_text;

      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ message: 'No fields provided for update' });
      }
      updateFields.updated_at = new Date(); // Manually set updated_at

      // Perform the update
      await db.query('UPDATE reviews SET ? WHERE review_id = ?', [updateFields, reviewId]);

      // Update product rating if rating changed
      if (rating !== undefined) {
        await updateProductRating(review.product_id);
      }

      res.json({ message: 'Review updated successfully' });
    } catch (err) {
      console.error('Error updating review:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   DELETE /api/reviews/:reviewId
// @desc    Delete a review
// @access  Private
router.delete('/:reviewId', auth, async (req, res) => {
  const reviewId = req.params.reviewId;
  const userId = req.user.user_id;

  try {
    // Find the review and verify ownership
    const [reviews] = await db.query('SELECT * FROM reviews WHERE review_id = ?', [reviewId]);
    if (reviews.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }
    const review = reviews[0];

    // Allow admin or the review owner to delete
    // TODO: Add admin check if needed: req.user.user_type === 'admin'
    if (review.user_id !== userId /* && req.user.user_type !== 'admin' */) {
      return res.status(403).json({ message: 'User not authorized to delete this review' });
    }

    // Perform deletion
    await db.query('DELETE FROM reviews WHERE review_id = ?', [reviewId]);

    // Update product rating
    await updateProductRating(review.product_id);

    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 