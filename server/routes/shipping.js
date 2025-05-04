const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/db');

// Get all shipping addresses for a user
router.get('/addresses', auth, async (req, res) => {
  try {
    // Correct way to access user ID from JWT token
    const userId = req.user.user.id;
    console.log('Fetching addresses for user:', userId);
    const [addresses] = await db.query(
      `SELECT * FROM user_shipping_details WHERE user_id = ? ORDER BY is_default DESC`,
      [userId]
    );
    
    // Ensure we're always returning an array
    const addressList = Array.isArray(addresses) ? addresses : [];
    console.log('Returning addresses:', addressList);
    res.json(addressList);
  } catch (err) {
    console.error('Error fetching addresses:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a new shipping address
router.post('/addresses', auth, async (req, res) => {
  try {
    // Correct way to access user ID from JWT token
    const userId = req.user.user.id;
    console.log('Adding new address for user:', userId);
    console.log('Request body:', req.body);
    
    const {
      address1,
      address2,
      barangay,
      city_municipality,
      province,
      region,
      postcode,
      address_type,
      is_default
    } = req.body;

    // Validate required fields
    if (!address1 || !city_municipality || !province || !region || !postcode) {
      return res.status(400).json({ message: 'Missing required address fields' });
    }

    // If this is the first address or is_default is true, set it as default
    const [existingAddresses] = await db.query(
      'SELECT id FROM user_shipping_details WHERE user_id = ?',
      [userId]
    );

    const shouldBeDefault = is_default || existingAddresses.length === 0;

    // If this should be default, unset any existing default
    if (shouldBeDefault) {
      await db.query(
        'UPDATE user_shipping_details SET is_default = false WHERE user_id = ?',
        [userId]
      );
    }

    const [result] = await db.query(
      `INSERT INTO user_shipping_details 
      (user_id, address1, address2, barangay, city_municipality, province, region, postcode, address_type, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, address1, address2 || '', barangay || '', city_municipality, province, region, postcode, address_type || 'home', shouldBeDefault]
    );

    console.log('Address added successfully:', result.insertId);
    res.status(201).json({
      id: result.insertId,
      message: 'Address added successfully'
    });
  } catch (err) {
    console.error('Error adding address:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Set an address as default
router.put('/addresses/:id/default', auth, async (req, res) => {
  try {
    // Correct way to access user ID from JWT token
    const userId = req.user.user.id;
    const addressId = req.params.id;
    console.log('Setting default address:', addressId, 'for user:', userId);

    // Verify the address belongs to the user
    const [address] = await db.query(
      'SELECT id FROM user_shipping_details WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );

    if (address.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // Unset current default
    await db.query(
      'UPDATE user_shipping_details SET is_default = false WHERE user_id = ?',
      [userId]
    );

    // Set new default
    await db.query(
      'UPDATE user_shipping_details SET is_default = true WHERE id = ?',
      [addressId]
    );

    console.log('Default address updated successfully');
    res.json({ message: 'Default address updated successfully' });
  } catch (err) {
    console.error('Error updating default address:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an address
router.delete('/addresses/:id', auth, async (req, res) => {
  try {
    // Correct way to access user ID from JWT token
    const userId = req.user.user.id;
    const addressId = req.params.id;
    console.log('Deleting address:', addressId, 'for user:', userId);

    // Verify the address belongs to the user
    const [address] = await db.query(
      'SELECT id, is_default FROM user_shipping_details WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );

    if (address.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // If this was the default address, set another address as default
    if (address[0].is_default) {
      const [otherAddresses] = await db.query(
        'SELECT id FROM user_shipping_details WHERE user_id = ? AND id != ? LIMIT 1',
        [userId, addressId]
      );

      if (otherAddresses.length > 0) {
        await db.query(
          'UPDATE user_shipping_details SET is_default = true WHERE id = ?',
          [otherAddresses[0].id]
        );
      }
    }

    await db.query('DELETE FROM user_shipping_details WHERE id = ?', [addressId]);

    console.log('Address deleted successfully');
    res.json({ message: 'Address deleted successfully' });
  } catch (err) {
    console.error('Error deleting address:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 