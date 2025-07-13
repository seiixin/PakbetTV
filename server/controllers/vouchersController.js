const db = require('../config/db');

// Generate a unique voucher code
function generateVoucherCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a new voucher
exports.createVoucher = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      name,
      description,
      type,
      discount_type,
      discount_value,
      max_discount,
      min_order_amount,
      max_redemptions,
      start_date,
      end_date,
      image_url,
      banner_image_url
    } = req.body;

    // Validate required fields
    if (!name || !type || !discount_type || !discount_value || !start_date || !end_date) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Missing required fields: name, type, discount_type, discount_value, start_date, end_date' 
      });
    }

    // Validate voucher type
    if (!['shipping', 'total_price'].includes(type)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Invalid voucher type. Must be "shipping" or "total_price"' });
    }

    // Validate discount type
    if (!['percentage', 'fixed'].includes(discount_type)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Invalid discount type. Must be "percentage" or "fixed"' });
    }

    // Validate discount value
    if (discount_type === 'percentage' && (discount_value <= 0 || discount_value > 100)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Percentage discount must be between 0 and 100' });
    }

    if (discount_type === 'fixed' && discount_value <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Fixed discount must be greater than 0' });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const now = new Date();

    if (startDate >= endDate) {
      await connection.rollback();
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Generate unique voucher code
    let voucherCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      voucherCode = generateVoucherCode();
      const [existing] = await connection.query(
        'SELECT voucher_id FROM vouchers WHERE code = ?',
        [voucherCode]
      );
      if (existing.length === 0) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      await connection.rollback();
      return res.status(500).json({ message: 'Failed to generate unique voucher code' });
    }

    // Insert voucher
    const [result] = await connection.query(
      `INSERT INTO vouchers (
        code, name, description, type, discount_type, discount_value, 
        max_discount, min_order_amount, max_redemptions, start_date, end_date,
        image_url, banner_image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        voucherCode,
        name,
        description,
        type,
        discount_type,
        discount_value,
        max_discount || null,
        min_order_amount || 0,
        max_redemptions || null,
        start_date,
        end_date,
        image_url || null,
        banner_image_url || null
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Voucher created successfully',
      voucher: {
        voucher_id: result.insertId,
        code: voucherCode,
        name,
        description,
        type,
        discount_type,
        discount_value,
        max_discount,
        min_order_amount,
        max_redemptions,
        start_date,
        end_date,
        image_url,
        banner_image_url
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating voucher:', error);
    res.status(500).json({ message: 'Failed to create voucher', error: error.message });
  } finally {
    connection.release();
  }
};

// Get all vouchers (admin)
exports.getAllVouchers = async (req, res) => {
  try {
    const [vouchers] = await db.query(
      `SELECT 
        voucher_id,
        code,
        name,
        description,
        type,
        discount_type,
        discount_value,
        max_discount,
        min_order_amount,
        max_redemptions,
        current_redemptions,
        start_date,
        end_date,
        is_active,
        image_url,
        banner_image_url,
        created_at,
        updated_at
       FROM vouchers 
       ORDER BY created_at DESC`
    );

    res.json(vouchers);
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    res.status(500).json({ message: 'Failed to fetch vouchers', error: error.message });
  }
};

// Get voucher by ID
exports.getVoucherById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [vouchers] = await db.query(
      `SELECT 
        voucher_id,
        code,
        name,
        description,
        type,
        discount_type,
        discount_value,
        max_discount,
        min_order_amount,
        max_redemptions,
        current_redemptions,
        start_date,
        end_date,
        is_active,
        image_url,
        banner_image_url,
        created_at,
        updated_at
       FROM vouchers 
       WHERE voucher_id = ?`,
      [id]
    );

    if (vouchers.length === 0) {
      return res.status(404).json({ message: 'Voucher not found' });
    }

    res.json(vouchers[0]);
  } catch (error) {
    console.error('Error fetching voucher:', error);
    res.status(500).json({ message: 'Failed to fetch voucher', error: error.message });
  }
};

// Update voucher
exports.updateVoucher = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      name,
      description,
      type,
      discount_type,
      discount_value,
      max_discount,
      min_order_amount,
      max_redemptions,
      start_date,
      end_date,
      is_active,
      image_url,
      banner_image_url
    } = req.body;

    // Check if voucher exists
    const [existing] = await connection.query(
      'SELECT voucher_id FROM vouchers WHERE voucher_id = ?',
      [id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Voucher not found' });
    }

    // Validate voucher type
    if (type && !['shipping', 'total_price'].includes(type)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Invalid voucher type. Must be "shipping" or "total_price"' });
    }

    // Validate discount type
    if (discount_type && !['percentage', 'fixed'].includes(discount_type)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Invalid discount type. Must be "percentage" or "fixed"' });
    }

    // Validate discount value
    if (discount_type === 'percentage' && discount_value && (discount_value <= 0 || discount_value > 100)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Percentage discount must be between 0 and 100' });
    }

    if (discount_type === 'fixed' && discount_value && discount_value <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Fixed discount must be greater than 0' });
    }

    // Validate dates
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (startDate >= endDate) {
        await connection.rollback();
        return res.status(400).json({ message: 'End date must be after start date' });
      }
    }

    // Update voucher
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(type);
    }
    if (discount_type !== undefined) {
      updateFields.push('discount_type = ?');
      updateValues.push(discount_type);
    }
    if (discount_value !== undefined) {
      updateFields.push('discount_value = ?');
      updateValues.push(discount_value);
    }
    if (max_discount !== undefined) {
      updateFields.push('max_discount = ?');
      updateValues.push(max_discount);
    }
    if (min_order_amount !== undefined) {
      updateFields.push('min_order_amount = ?');
      updateValues.push(min_order_amount);
    }
    if (max_redemptions !== undefined) {
      updateFields.push('max_redemptions = ?');
      updateValues.push(max_redemptions);
    }
    if (start_date !== undefined) {
      updateFields.push('start_date = ?');
      updateValues.push(start_date);
    }
    if (end_date !== undefined) {
      updateFields.push('end_date = ?');
      updateValues.push(end_date);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active);
    }
    if (image_url !== undefined) {
      updateFields.push('image_url = ?');
      updateValues.push(image_url);
    }
    if (banner_image_url !== undefined) {
      updateFields.push('banner_image_url = ?');
      updateValues.push(banner_image_url);
    }

    if (updateFields.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await connection.query(
      `UPDATE vouchers SET ${updateFields.join(', ')} WHERE voucher_id = ?`,
      updateValues
    );

    await connection.commit();

    res.json({ message: 'Voucher updated successfully' });

  } catch (error) {
    await connection.rollback();
    console.error('Error updating voucher:', error);
    res.status(500).json({ message: 'Failed to update voucher', error: error.message });
  } finally {
    connection.release();
  }
};

// Delete voucher
exports.deleteVoucher = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // Check if voucher exists
    const [existing] = await connection.query(
      'SELECT voucher_id FROM vouchers WHERE voucher_id = ?',
      [id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Voucher not found' });
    }

    // Check if voucher has been used
    const [redemptions] = await connection.query(
      'SELECT COUNT(*) as count FROM voucher_redemptions WHERE voucher_id = ?',
      [id]
    );

    if (redemptions[0].count > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Cannot delete voucher that has been used. Consider deactivating it instead.' 
      });
    }

    // Delete voucher
    await connection.query('DELETE FROM vouchers WHERE voucher_id = ?', [id]);

    await connection.commit();

    res.json({ message: 'Voucher deleted successfully' });

  } catch (error) {
    await connection.rollback();
    console.error('Error deleting voucher:', error);
    res.status(500).json({ message: 'Failed to delete voucher', error: error.message });
  } finally {
    connection.release();
  }
};

// Validate voucher code (for users)
exports.validateVoucher = async (req, res) => {
  try {
    const { code, order_amount = 0 } = req.body;
    const userId = req.user?.id;

    if (!code) {
      return res.status(400).json({ message: 'Voucher code is required' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get voucher details
    const [vouchers] = await db.query(
      `SELECT 
        voucher_id,
        code,
        name,
        description,
        type,
        discount_type,
        discount_value,
        max_discount,
        min_order_amount,
        max_redemptions,
        current_redemptions,
        start_date,
        end_date,
        is_active
       FROM vouchers 
       WHERE code = ?`,
      [code]
    );

    if (vouchers.length === 0) {
      return res.status(404).json({ message: 'Invalid voucher code' });
    }

    const voucher = vouchers[0];

    // Check if voucher is active
    if (!voucher.is_active) {
      return res.status(400).json({ message: 'Voucher is not active' });
    }

    // Check if voucher is within valid date range
    const now = new Date();
    const startDate = new Date(voucher.start_date);
    const endDate = new Date(voucher.end_date);

    if (now < startDate) {
      return res.status(400).json({ message: 'Voucher is not yet active' });
    }

    if (now > endDate) {
      return res.status(400).json({ message: 'Voucher has expired' });
    }

    // Check minimum order amount
    if (order_amount < voucher.min_order_amount) {
      return res.status(400).json({ 
        message: `Minimum order amount of ₱${voucher.min_order_amount} required` 
      });
    }

    // Check maximum redemptions
    if (voucher.max_redemptions && voucher.current_redemptions >= voucher.max_redemptions) {
      return res.status(400).json({ message: 'Voucher has reached maximum redemptions' });
    }

    // Check if user has already used this voucher
    const [userRedemptions] = await db.query(
      'SELECT COUNT(*) as count FROM voucher_redemptions WHERE voucher_id = ? AND user_id = ?',
      [voucher.voucher_id, userId]
    );

    if (userRedemptions[0].count > 0) {
      return res.status(400).json({ message: 'You have already used this voucher' });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (voucher.discount_type === 'percentage') {
      discountAmount = (order_amount * voucher.discount_value) / 100;
      if (voucher.max_discount && discountAmount > voucher.max_discount) {
        discountAmount = voucher.max_discount;
      }
    } else {
      discountAmount = voucher.discount_value;
    }

    res.json({
      message: 'Voucher is valid',
      voucher: {
        voucher_id: voucher.voucher_id,
        code: voucher.code,
        name: voucher.name,
        description: voucher.description,
        type: voucher.type,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        max_discount: voucher.max_discount,
        discount_amount: discountAmount
      }
    });

  } catch (error) {
    console.error('Error validating voucher:', error);
    res.status(500).json({ message: 'Failed to validate voucher', error: error.message });
  }
};

// Get voucher statistics
exports.getVoucherStats = async (req, res) => {
  try {
    const [stats] = await db.query(
      `SELECT 
        COUNT(*) as total_vouchers,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_vouchers,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_vouchers,
        SUM(current_redemptions) as total_redemptions
       FROM vouchers`
    );

    const [recentRedemptions] = await db.query(
      `SELECT 
        vr.redemption_id,
        v.code,
        v.name,
        vr.discount_amount,
        vr.applied_to,
        vr.redeemed_at,
        u.first_name,
        u.last_name,
        o.order_code
       FROM voucher_redemptions vr
       JOIN vouchers v ON vr.voucher_id = v.voucher_id
       JOIN users u ON vr.user_id = u.user_id
       JOIN orders o ON vr.order_id = o.order_id
       ORDER BY vr.redeemed_at DESC
       LIMIT 10`
    );

    res.json({
      stats: stats[0],
      recent_redemptions: recentRedemptions
    });

  } catch (error) {
    console.error('Error fetching voucher stats:', error);
    res.status(500).json({ message: 'Failed to fetch voucher statistics', error: error.message });
  }
};

// Upload voucher image
exports.uploadVoucherImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const imageUrl = `/uploads/vouchers/${req.file.filename}`;
    
    res.json({
      message: 'Image uploaded successfully',
      image_url: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading voucher image:', error);
    res.status(500).json({ message: 'Failed to upload image', error: error.message });
  }
}; 