const db = require('../config/db');
const promotionService = require('../services/promotionService');

/**
 * Validate a promotion code
 */
const validatePromotion = async (req, res) => {
  try {
    const { code, order_amount = 0, shipping_fee = 0, items = [] } = req.body;
    const userId = req.user?.id;

    if (!code) {
      return res.status(400).json({ message: 'Promotion code is required' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get promotion details by code
    const [promotions] = await db.query(
      `SELECT 
        promotion_id,
        promotion_code,
        promotion_name,
        promotion_type,
        discount_type,
        discount_value,
        shipping_override_amount,
        free_shipping,
        target_type,
        target_id,
        minimum_order_amount,
        usage_limit,
        usage_limit_per_user,
        current_usage_count,
        start_date,
        end_date,
        is_active,
        description,
        terms_and_conditions
       FROM promotions 
       WHERE promotion_code = ?`,
      [code]
    );

    if (promotions.length === 0) {
      return res.status(400).json({ 
        valid: false,
        message: 'Invalid promotion code' 
      });
    }

    const promotion = promotions[0];

    // Check if promotion is active
    if (!promotion.is_active) {
      return res.status(400).json({ 
        valid: false,
        message: 'Promotion is not active' 
      });
    }

    // Check if promotion is within valid date range
    const now = new Date();
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);

    if (now < startDate) {
      return res.status(400).json({ 
        valid: false,
        message: 'Promotion is not yet active' 
      });
    }

    if (now > endDate) {
      return res.status(400).json({ 
        valid: false,
        message: 'Promotion has expired' 
      });
    }

    // Check minimum order amount
    if (promotion.minimum_order_amount && order_amount < promotion.minimum_order_amount) {
      return res.status(400).json({ 
        valid: false,
        message: `Minimum order amount of ₱${promotion.minimum_order_amount} required` 
      });
    }

    // Check total usage limit
    if (promotion.usage_limit && promotion.current_usage_count >= promotion.usage_limit) {
      return res.status(400).json({ 
        valid: false,
        message: 'Promotion has reached maximum usage limit' 
      });
    }

    // Check per-user usage limit
    if (promotion.usage_limit_per_user) {
      const [userUsage] = await db.query(
        'SELECT COUNT(*) as count FROM promotion_usage WHERE promotion_id = ? AND user_id = ?',
        [promotion.promotion_id, userId]
      );

      if (userUsage[0].count >= promotion.usage_limit_per_user) {
        return res.status(400).json({ 
          valid: false,
          message: 'You have already used this promotion code' 
        });
      }
    }

    // Use the promotion service to calculate the actual discount
    try {
      const cartData = {
        items: items,
        subtotal: order_amount,
        shipping_fee: shipping_fee || 100, // Use actual shipping fee or fallback to 100
        promo_code: code
      };

      const promotionResult = await promotionService.applyPromotions(cartData, userId);
      
      const totalDiscount = promotionResult.product_discount + promotionResult.shipping_discount;
      
      return res.json({
        valid: true,
        promotion: {
          id: promotion.promotion_id,
          code: promotion.promotion_code,
          name: promotion.promotion_name,
          type: promotion.promotion_type,
          description: promotion.description,
          terms_and_conditions: promotion.terms_and_conditions
        },
        discount: {
          product_discount: parseFloat(promotionResult.product_discount) || 0,
          shipping_discount: parseFloat(promotionResult.shipping_discount) || 0,
          total_discount: parseFloat(totalDiscount) || 0,
          final_subtotal: parseFloat(promotionResult.final_subtotal) || 0,
          final_shipping: parseFloat(promotionResult.final_shipping) || 0,
          final_total: parseFloat(promotionResult.final_total) || 0
        },
        message: 'Promotion code applied successfully!'
      });

    } catch (promotionError) {
      return res.status(400).json({ 
        valid: false,
        message: promotionError.message 
      });
    }

  } catch (error) {
    console.error('Error validating promotion:', error);
    res.status(500).json({ 
      valid: false,
      message: 'Failed to validate promotion code',
      error: error.message 
    });
  }
};

/**
 * Get all active promotions
 */
const getActivePromotions = async (req, res) => {
  try {
    const [promotions] = await db.query(
      `SELECT 
        promotion_id,
        promotion_code,
        promotion_name,
        promotion_type,
        discount_type,
        discount_value,
        shipping_override_amount,
        free_shipping,
        minimum_order_amount,
        description,
        terms_and_conditions,
        start_date,
        end_date
       FROM promotions 
       WHERE is_active = TRUE 
       AND start_date <= CURDATE() 
       AND end_date >= CURDATE()
       ORDER BY priority DESC`
    );

    res.json({
      promotions: promotions.map(promo => ({
        ...promo,
        // Don't expose internal fields
        usage_limit: undefined,
        current_usage_count: undefined,
        usage_limit_per_user: undefined
      }))
    });

  } catch (error) {
    console.error('Error fetching active promotions:', error);
    res.status(500).json({ 
      message: 'Failed to fetch promotions',
      error: error.message 
    });
  }
};

/**
 * Get promotion details by code (public endpoint)
 */
const getPromotionByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const [promotions] = await db.query(
      `SELECT 
        promotion_id,
        promotion_code,
        promotion_name,
        promotion_type,
        description,
        terms_and_conditions,
        minimum_order_amount,
        start_date,
        end_date,
        is_active
       FROM promotions 
       WHERE promotion_code = ?`,
      [code]
    );

    if (promotions.length === 0) {
      return res.status(404).json({ 
        message: 'Promotion not found' 
      });
    }

    const promotion = promotions[0];

    // Check if promotion is still valid
    const now = new Date();
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);

    const isValid = promotion.is_active && now >= startDate && now <= endDate;

    res.json({
      promotion: {
        ...promotion,
        is_valid: isValid
      }
    });

  } catch (error) {
    console.error('Error fetching promotion by code:', error);
    res.status(500).json({ 
      message: 'Failed to fetch promotion',
      error: error.message 
    });
  }
};

module.exports = {
  validatePromotion,
  getActivePromotions,
  getPromotionByCode
};
