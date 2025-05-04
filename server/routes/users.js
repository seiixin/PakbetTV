const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth, admin } = require('../middleware/auth');

router.post(
  '/',
  [
    body('firstName', 'First name is required').notEmpty(),
    body('lastName', 'Last name is required').notEmpty(),
    body('username', 'Username is required').notEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { firstName, lastName, username, email, password, phone, address } = req.body;
    try {
      const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      const [result] = await db.query(
        'INSERT INTO users (first_name, last_name, username, email, password, phone, address, user_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [firstName, lastName, username, email, hashedPassword, phone || null, address || null, 'customer', 'Active']
      );
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: result.insertId,
          firstName,
          lastName,
          email
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

router.get('/', [auth, admin], async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT user_id, first_name, last_name, username, email, phone, address, user_type, status, created_at, updated_at FROM users'
    );
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all shipping addresses for a user
router.get('/shipping-addresses', auth, async (req, res) => {
  try {
    // Support both user object structures
    const userId = req.user.id || req.user.user.id;
    console.log('Fetching shipping addresses for user:', userId);
    
    const [addresses] = await db.query(
      'SELECT * FROM user_shipping_details WHERE user_id = ? ORDER BY is_default DESC, id DESC',
      [userId]
    );
    
    console.log('Found addresses:', addresses);
    // Always return an array, even if empty
    res.status(200).json(addresses || []);
  } catch (err) {
    console.error('Error fetching shipping addresses:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user.user.userType !== 'admin' && req.user.user.id !== parseInt(userId)) {
      return res.status(403).json({ message: 'Not authorized to view this user' });
    }
    const [users] = await db.query(
      'SELECT user_id, first_name, last_name, username, email, phone, address, user_type, status, created_at, updated_at FROM users WHERE user_id = ?',
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(users[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user.user.userType !== 'admin' && req.user.user.id !== parseInt(userId)) {
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }
    const { firstName, lastName, phone, address } = req.body;
    const updates = {};
    if (firstName) updates.first_name = firstName;
    if (lastName) updates.last_name = lastName;
    if (phone) updates.phone = phone;
    if (address) updates.address = address;
    if (req.user.user.userType === 'admin') {
      if (req.body.status) updates.status = req.body.status;
      if (req.body.userType) updates.user_type = req.body.userType;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No update data provided' });
    }
    let sql = 'UPDATE users SET ';
    const values = [];
    Object.keys(updates).forEach((key, index) => {
      sql += `${key} = ?`;
      if (index < Object.keys(updates).length - 1) {
        sql += ', ';
      }
      values.push(updates[key]);
    });
    sql += ' WHERE user_id = ?';
    values.push(userId);
    const [result] = await db.query(sql, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const userId = req.params.id;
    const [result] = await db.query('DELETE FROM users WHERE user_id = ?', [userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile with shipping addresses
router.get('/profile', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user.id;
    console.log('Fetching profile for user:', userId);
    
    // Get user profile
    const [users] = await db.query(
      'SELECT user_id, username, first_name, last_name, email, phone, address, user_type, status FROM users WHERE user_id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get shipping addresses
    const [shippingAddresses] = await db.query(
      'SELECT * FROM user_shipping_details WHERE user_id = ? ORDER BY is_default DESC, id DESC',
      [userId]
    );
    
    const user = users[0];
    res.json({
      id: user.user_id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
      userType: user.user_type,
      status: user.status,
      shippingAddresses: shippingAddresses || []
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add or update user shipping address
router.post('/shipping-address', auth, [
  body('region').notEmpty().withMessage('Region is required'),
  body('province').notEmpty().withMessage('Province is required'),
  body('city_municipality').notEmpty().withMessage('City/Municipality is required'),
  body('barangay').notEmpty().withMessage('Barangay is required'),
  body('postcode').notEmpty().withMessage('Postal code is required')
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const userId = req.user.id || req.user.user.id;
  console.log('Adding/updating shipping address for user:', userId);
  
  const {
    region,
    province,
    city_municipality,
    barangay,
    street_name,
    building,
    house_number,
    address2,
    postcode,
    country = 'PH',
    address_type = 'home',
    is_default = true,
    phone
  } = req.body;

  // Construct address1 from the components
  const address1Components = [barangay];
  if (street_name) address1Components.push(street_name);
  if (house_number) address1Components.push(house_number);
  if (building) address1Components.push(building);
  
  const address1 = address1Components.join(', ');
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log('Started transaction');

    // First update the main user profile with phone
    await connection.query(
      'UPDATE users SET phone = ?, updated_at = NOW() WHERE user_id = ?',
      [phone, userId]
    );
    console.log('Updated main user profile');
    
    // Delete any empty shipping addresses
    await connection.query(
      'DELETE FROM user_shipping_details WHERE user_id = ? AND (address1 = \'\' OR address1 IS NULL)',
      [userId]
    );
    console.log('Cleaned up empty shipping addresses');
    
    // If this is the default address, reset all other addresses to non-default
    if (is_default) {
      await connection.query(
        'UPDATE user_shipping_details SET is_default = 0 WHERE user_id = ?',
        [userId]
      );
      console.log('Reset default status for other addresses');
    }
    
    // Check if user already has shipping details
    const [details] = await connection.query(
      'SELECT id FROM user_shipping_details WHERE user_id = ? AND address1 IS NOT NULL AND address1 != \'\'',
      [userId]
    );
    
    if (details.length > 0) {
      console.log('Updating existing shipping details:', details[0].id);
      // Update existing shipping details
      await connection.query(
        `UPDATE user_shipping_details 
        SET 
          address1 = ?,
          address2 = ?,
          city = ?,
          state = ?,
          postcode = ?,
          country = ?,
          address_type = ?,
          is_default = ?,
          region = ?,
          province = ?,
          city_municipality = ?,
          barangay = ?,
          street_name = ?,
          building = ?,
          house_number = ?,
          address_format = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          address1,
          address2 || '',
          city_municipality,
          province,
          postcode,
          country,
          address_type,
          is_default ? 1 : 0,
          region,
          province,
          city_municipality,
          barangay,
          street_name || null,
          building || null,
          house_number || null,
          'philippines',
          details[0].id
        ]
      );
    } else {
      console.log('Creating new shipping details');
      // Insert new shipping details
      await connection.query(
        `INSERT INTO user_shipping_details 
        (user_id, address1, address2, city, state, postcode, country, address_type, is_default,
         region, province, city_municipality, barangay, street_name, building, house_number, address_format)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          address1,
          address2 || '',
          city_municipality,
          province,
          postcode,
          country,
          address_type,
          is_default ? 1 : 0,
          region,
          province,
          city_municipality,
          barangay,
          street_name || null,
          building || null,
          house_number || null,
          'philippines'
        ]
      );
    }
    
    await connection.commit();
    console.log('Transaction committed successfully');
    res.status(200).json({ 
      message: 'Address and contact information updated successfully',
      address: address1,
      phone: phone
    });
    
  } catch (err) {
    await connection.rollback();
    console.error('Error saving address information:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Delete shipping address
router.delete('/shipping-address/:id', auth, async (req, res) => {
  try {
    // Support both user object structures
    const userId = req.user.id || req.user.user.id;
    const addressId = req.params.id;
    
    console.log(`Attempting to delete shipping address ${addressId} for user ${userId}`);
    
    // Verify the address belongs to the user
    const [address] = await db.query(
      'SELECT is_default FROM user_shipping_details WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );
    
    if (address.length === 0) {
      return res.status(404).json({ message: 'Address not found or not authorized' });
    }
    
    // If deleting default address, find another address to make default
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Delete the address
      await connection.query(
        'DELETE FROM user_shipping_details WHERE id = ?',
        [addressId]
      );
      
      // If it was the default address, make another address default if exists
      if (address[0].is_default) {
        const [otherAddresses] = await connection.query(
          'SELECT id FROM user_shipping_details WHERE user_id = ? LIMIT 1',
          [userId]
        );
        
        if (otherAddresses.length > 0) {
          await connection.query(
            'UPDATE user_shipping_details SET is_default = 1 WHERE id = ?',
            [otherAddresses[0].id]
          );
        }
      }
      
      await connection.commit();
      console.log('Successfully deleted shipping address');
      
      res.status(200).json({ message: 'Shipping address deleted successfully' });
    } catch (err) {
      await connection.rollback();
      console.error('Error deleting shipping address:', err);
      res.status(500).json({ message: 'Server error' });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Error processing shipping address deletion:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (admin only)
router.get('/', [auth, admin], async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT user_id, first_name, last_name, email, phone, address, user_type, status, created_at FROM users'
    );
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 