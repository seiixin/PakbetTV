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
    
    // Join with users table to get phone number
    const [addresses] = await db.query(
      `SELECT sd.*, u.phone 
       FROM user_shipping_details sd
       LEFT JOIN users u ON sd.user_id = u.user_id
       WHERE sd.user_id = ? 
       ORDER BY sd.is_default DESC, sd.id DESC`,
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

// Update user profile - IMPORTANT: This must come BEFORE the /:id route
router.put('/profile', auth, [
  body('firstName', 'First name is required').notEmpty(),
  body('lastName', 'Last name is required').notEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('username', 'Username is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { firstName, lastName, email, phone, username } = req.body;

  try {
    // Check if email or username already exists for other users
    const [existingUsers] = await db.query(
      'SELECT user_id FROM users WHERE (email = ? OR username = ?) AND user_id != ?',
      [email, username, req.user.id]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        message: 'Email or username is already taken by another user' 
      });
    }

    // Update user profile
    await db.query(
      `UPDATE users 
       SET first_name = ?, 
           last_name = ?, 
           email = ?, 
           phone = ?,
           username = ?
       WHERE user_id = ?`,
      [firstName, lastName, email, phone || null, username, req.user.id]
    );

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        firstName,
        lastName,
        email,
        phone,
        username
      }
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID - This route should come AFTER /profile
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user.userType !== 'admin' && req.user.id !== parseInt(userId)) {
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

// Update user by ID - This route should come AFTER /profile
router.put('/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user.userType.toLowerCase() !== 'admin' && req.user.id !== parseInt(userId)) {
      console.log('Access denied - User types:', { 
        requestingUserType: req.user.userType, 
        requestingUserId: req.user.id,
        targetUserId: parseInt(userId)
      });
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }
    const { firstName, lastName, phone, address } = req.body;
    const updates = {};
    if (firstName) updates.first_name = firstName;
    if (lastName) updates.last_name = lastName;
    if (phone) updates.phone = phone;
    if (address) updates.address = address;
    if (req.user.userType === 'admin') {
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

// Add this function to check if user_shipping_details table exists
const ensureShippingDetailsTable = async (connection) => {
  try {
    // Try to select from the table to check if it exists
    await connection.query('SELECT 1 FROM user_shipping_details LIMIT 1');
    console.log('user_shipping_details table exists');
    return true;
  } catch (error) {
    // If error contains "doesn't exist", create the table
    if (error.message.includes("doesn't exist") || error.message.includes("not found")) {
      console.log('user_shipping_details table does not exist, creating it...');
      try {
        await connection.query(`
          CREATE TABLE user_shipping_details (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            address1 VARCHAR(255),
            address2 VARCHAR(255),
            city VARCHAR(100),
            state VARCHAR(100),
            postcode VARCHAR(20),
            country VARCHAR(2) DEFAULT 'PH',
            address_type VARCHAR(20) DEFAULT 'home',
            is_default BOOLEAN DEFAULT 1,
            region VARCHAR(100),
            province VARCHAR(100),
            city_municipality VARCHAR(100),
            barangay VARCHAR(100),
            street_name VARCHAR(255),
            building VARCHAR(255),
            house_number VARCHAR(50),
            address_format VARCHAR(50) DEFAULT 'philippines',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
          )
        `);
        console.log('user_shipping_details table created successfully');
        return true;
      } catch (createError) {
        console.error('Error creating user_shipping_details table:', createError);
        return false;
      }
    } else {
      console.error('Error checking user_shipping_details table:', error);
      return false;
    }
  }
};

// Get user profile with shipping addresses
router.get('/profile', auth, async (req, res) => {
  try {
    // Log the user object and request details for debugging
    console.log('Profile request received:', {
      headers: req.headers,
      user: req.user
    });
    
    // Get user ID from req.user, handling both object structures
    const userId = req.user?.id || req.user?.user?.id;
    
    if (!userId) {
      console.error('No user ID found in token payload:', req.user);
      return res.status(401).json({ message: 'Invalid user token structure' });
    }
    
    console.log('Attempting to fetch profile for user ID:', userId);
    
    // Test database connection first
    const connection = await db.getConnection();
    console.log('Database connection successful');
    
    try {
      // Fetch user basic info and shipping details in parallel
      const [userResults] = await connection.query(
        'SELECT user_id, username, first_name, last_name, email, phone, address FROM users WHERE user_id = ?',
        [userId]
      );
      
      if (!userResults || userResults.length === 0) {
        connection.release();
        console.log('User not found for ID:', userId);
        return res.status(404).json({ message: 'User not found' });
      }
      
      const user = userResults[0];
      
      // Fetch shipping details
      const [shippingResults] = await connection.query(
        `SELECT * FROM user_shipping_details 
         WHERE user_id = ? AND is_default = 1
         ORDER BY updated_at DESC LIMIT 1`,
        [userId]
      );
      
      connection.release();
      
      const shippingAddress = shippingResults?.[0];
      
      console.log('User profile and shipping details retrieved successfully');
      
      // Combine user data with shipping details
      const response = {
        id: user.user_id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        shipping_details: shippingAddress ? {
          address1: shippingAddress.address1 || '',
          address2: shippingAddress.address2 || '',
          city: shippingAddress.city_municipality || '',
          state: shippingAddress.province || '',
          postal_code: shippingAddress.postcode || '',
          country: shippingAddress.country || 'PH',
          region: shippingAddress.region || '',
          barangay: shippingAddress.barangay || '',
          street_name: shippingAddress.street_name || '',
          building: shippingAddress.building || '',
          house_number: shippingAddress.house_number || '',
          is_default: Boolean(shippingAddress.is_default)
        } : null
      };
      
      res.json(response);
    } catch (dbError) {
      connection.release();
      console.error('Database query error:', dbError);
      throw dbError;
    }
  } catch (err) {
    console.error('Profile endpoint error:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    
    // Send appropriate error response based on error type
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ message: 'Database connection failed' });
    }
    
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      return res.status(503).json({ message: 'Database authentication failed' });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Check all URLs and profile endpoints
router.get('/profile-debug', auth, (req, res) => {
      res.json({
    message: 'Profile debug info',
        user: {
      id: req.user.id,
      userType: req.user.userType,
      token: req.header('Authorization') ? 'Present' : 'Missing'
    }
  });
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
  
  // Construct full address for user's main address field
  const fullAddressComponents = [
    address1,
    city_municipality,
    province,
    region,
    postcode,
    country
  ].filter(Boolean);
  
  const fullAddress = fullAddressComponents.join(', ');
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log('Started transaction');

    // First update the main user profile with phone and address
    await connection.query(
      'UPDATE users SET phone = ?, address = ?, updated_at = NOW() WHERE user_id = ?',
      [phone, fullAddress, userId]
    );
    console.log('Updated main user profile with address:', fullAddress);
    
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
      address: fullAddress,
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

router.post('/update-shipping', auth, async (req, res) => {
  try {
    const { name, address, city, state, postal_code, phone } = req.body;
    console.log('Updating shipping details:', { address, phone });
    
    // Get user ID from req.user
    const userId = req.user.id;
    console.log('Using user ID for update:', userId);
    
    // Update only the fields that exist in the database
    const [result] = await db.query(
      `UPDATE users SET 
        address = ?,
        phone = ?
      WHERE user_id = ?`,
      [address, phone, userId]
    );
    
    console.log('Update result:', result.affectedRows > 0 ? 'Success' : 'No rows updated');
    
    res.status(200).json({ 
      message: 'Shipping details updated successfully',
      updated: result.affectedRows > 0
    });
  } catch (error) {
    console.error('Error updating shipping details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to update shipping details',
      error: error.message 
    });
  }
});

// Update username
router.put('/update-username', auth, [
  body('username', 'Username is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username } = req.body;
    
    // Check if username is already taken
    const [existingUsers] = await db.query(
      'SELECT user_id FROM users WHERE username = ? AND user_id != ?',
      [username, req.user.id]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Update username
    await db.query(
      'UPDATE users SET username = ? WHERE user_id = ?',
      [username, req.user.id]
    );

    res.json({ message: 'Username updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update password
router.put('/update-password', auth, [
  body('currentPassword', 'Current password is required').exists(),
  body('newPassword', 'Please enter a new password with 6 or more characters').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    // Get user's current password
    const [users] = await db.query(
      'SELECT password FROM users WHERE user_id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await db.query(
      'UPDATE users SET password = ? WHERE user_id = ?',
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 