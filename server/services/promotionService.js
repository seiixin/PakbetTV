const db = require('../config/db');

class PromotionService {
  
  /**
   * Get all active promotions for a user
   */
  async getActivePromotions(userId) {
    const [promotions] = await db.query(`
      SELECT * FROM promotions 
      WHERE is_active = TRUE 
      AND start_date <= CURDATE() 
      AND end_date >= CURDATE()
      ORDER BY priority DESC
    `);
    
    return promotions;
  }

  /**
   * Apply promotions to a cart/order
   */
  async applyPromotions(cartData, userId) {
    const { items, subtotal, shipping_fee, promo_code } = cartData;
    
    let promotions = [];
    
    // If promo code provided, validate it first
    if (promo_code) {
      const [promoByCode] = await db.query(`
        SELECT * FROM promotions 
        WHERE promotion_code = ? 
        AND is_active = TRUE 
        AND start_date <= CURDATE() 
        AND end_date >= CURDATE()
      `, [promo_code]);
      
      if (promoByCode.length === 0) {
        throw new Error('Invalid promo code');
      }
      
      promotions = promoByCode;
    } else {
      // Get all applicable promotions
      promotions = await this.getActivePromotions(userId);
    }

    let totalProductDiscount = 0;
    let totalShippingDiscount = 0;
    let appliedPromotions = [];

    for (const promo of promotions) {
      // Check usage limits
      const canUsePromo = await this.checkUsageLimits(promo, userId);
      if (!canUsePromo) continue;

      // Check minimum order requirement
      if (promo.minimum_order_amount && subtotal < promo.minimum_order_amount) {
        continue;
      }

      let discount = 0;
      let shippingDiscount = 0;

      switch (promo.promotion_type) {
        case 'product_discount':
          discount = this.calculateProductDiscount(items, promo, subtotal);
          totalProductDiscount += discount;
          break;

        case 'total_discount':
          if (promo.discount_type === 'percentage') {
            discount = (subtotal * promo.discount_value) / 100;
          } else {
            discount = promo.discount_value;
          }
          // Apply maximum discount cap if specified
          if (promo.max_discount_value && discount > promo.max_discount_value) {
            discount = promo.max_discount_value;
          }
          totalProductDiscount += discount;
          break;

        case 'shipping_discount':
          if (promo.free_shipping) {
            shippingDiscount = shipping_fee;
          } else if (promo.shipping_override_amount) {
            shippingDiscount = Math.max(0, shipping_fee - promo.shipping_override_amount);
          }
          totalShippingDiscount = Math.max(totalShippingDiscount, shippingDiscount);
          break;

        case 'free_shipping':
          shippingDiscount = shipping_fee;
          totalShippingDiscount = Math.max(totalShippingDiscount, shippingDiscount);
          break;
      }

      if (discount > 0 || shippingDiscount > 0) {
        appliedPromotions.push({
          ...promo,
          applied_discount: discount,
          applied_shipping_discount: shippingDiscount
        });
      }
    }

    const finalShippingCost = Math.max(0, shipping_fee - totalShippingDiscount);
    const finalSubtotal = Math.max(0, subtotal - totalProductDiscount);
    const finalTotal = finalSubtotal + finalShippingCost;

    return {
      original_subtotal: subtotal,
      original_shipping: shipping_fee,
      product_discount: totalProductDiscount,
      shipping_discount: totalShippingDiscount,
      final_subtotal: finalSubtotal,
      final_shipping: finalShippingCost,
      final_total: finalTotal,
      applied_promotions: appliedPromotions
    };
  }

  /**
   * Calculate product-specific discounts
   */
  calculateProductDiscount(items, promo, subtotal) {
    let discount = 0;

    if (promo.target_type === 'all') {
      // Apply to entire order
      if (promo.discount_type === 'percentage') {
        discount = (subtotal * promo.discount_value) / 100;
      } else {
        discount = promo.discount_value;
      }
    } else if (promo.target_type === 'product' && promo.target_id) {
      // Apply to specific product
      const targetItem = items.find(item => item.product_id === promo.target_id);
      if (targetItem) {
        const itemTotal = targetItem.price * targetItem.quantity;
        if (promo.discount_type === 'percentage') {
          discount = (itemTotal * promo.discount_value) / 100;
        } else {
          discount = Math.min(promo.discount_value, itemTotal);
        }
      }
    } else if (promo.target_type === 'category' && promo.target_id) {
      // Apply to specific category - would need product categories
      // Implementation depends on your product structure
    }

    // Apply maximum discount cap if specified
    if (promo.max_discount_value && discount > promo.max_discount_value) {
      discount = promo.max_discount_value;
    }

    return discount;
  }

  /**
   * Check if user can use this promotion (usage limits)
   */
  async checkUsageLimits(promo, userId) {
    // Check total usage limit
    if (promo.usage_limit && promo.current_usage_count >= promo.usage_limit) {
      return false;
    }

    // Check per-user limit
    if (promo.usage_limit_per_user) {
      const [userUsage] = await db.query(`
        SELECT COUNT(*) as usage_count 
        FROM promotion_usage 
        WHERE promotion_id = ? AND user_id = ?
      `, [promo.promotion_id, userId]);

      if (userUsage[0].usage_count >= promo.usage_limit_per_user) {
        return false;
      }
    }

    return true;
  }

  /**
   * Record promotion usage after successful order
   */
  async recordPromotionUsage(promotions, userId, orderId) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      for (const promo of promotions) {
        // Insert usage record
        await connection.query(`
          INSERT INTO promotion_usage (
            promotion_id, user_id, order_id, 
            discount_amount, shipping_discount
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          promo.promotion_id,
          userId,
          orderId,
          promo.applied_discount || 0,
          promo.applied_shipping_discount || 0
        ]);

        // Update usage count
        await connection.query(`
          UPDATE promotions 
          SET current_usage_count = current_usage_count + 1 
          WHERE promotion_id = ?
        `, [promo.promotion_id]);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Validate promo code (for frontend validation)
   */
  async validatePromoCode(promoCode, userId, cartData) {
    try {
      const result = await this.applyPromotions({
        ...cartData,
        promo_code: promoCode
      }, userId);
      
      return {
        valid: true,
        discount: result.product_discount + result.shipping_discount,
        message: 'Promo code applied successfully!'
      };
    } catch (error) {
      return {
        valid: false,
        discount: 0,
        message: error.message
      };
    }
  }
}

module.exports = new PromotionService();
