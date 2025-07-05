// All logic from users.js route handlers should be moved here as named exports.
// Export each handler as a named function, do not change any logic.
// (Insert all route handler logic and helper functions from users.js here)

const { validationResult } = require('express-validator');
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// User registration
exports.registerUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, username, email, password } = req.body;

    // Check if user already exists
    const userExists = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (userExists.length > 0) {
      return res.status(400).json({ 
        errors: [{ msg: 'User already exists' }] 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into database
    const result = await db.query(
      'INSERT INTO users (first_name, last_name, username, email, password) VALUES (?, ?, ?, ?, ?)',
      [firstName, lastName, username, email, hashedPassword]
    );

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await db.query('SELECT id, first_name, last_name, username, email, created_at FROM users');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user shipping addresses
exports.getShippingAddresses = async (req, res) => {
  try {
    const addresses = await db.query(
      'SELECT * FROM user_shipping_details WHERE user_id = ?',
      [req.user.id]
    );
    res.json(addresses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, username } = req.body;

    await db.query(
      'UPDATE users SET first_name = ?, last_name = ?, email = ?, username = ? WHERE id = ?',
      [firstName, lastName, email, username, req.user.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const [user] = await db.query(
      'SELECT id, first_name, last_name, username, email, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user by ID
exports.updateUserById = async (req, res) => {
  try {
    const { firstName, lastName, email, username } = req.body;

    await db.query(
      'UPDATE users SET first_name = ?, last_name = ?, email = ?, username = ? WHERE id = ?',
      [firstName, lastName, email, username, req.params.id]
    );

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user by ID
exports.deleteUserById = async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const [user] = await db.query(
      'SELECT id, first_name, last_name, username, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Debug profile info
exports.profileDebug = async (req, res) => {
  try {
    res.json({
      user: req.user,
      session: req.session
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add or update shipping address
exports.addOrUpdateShippingAddress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { region, province, city_municipality, barangay, postcode, street_address, label } = req.body;

    const result = await db.query(
      `INSERT INTO user_shipping_details 
       (user_id, region, province, city_municipality, barangay, postcode, street_address, label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, region, province, city_municipality, barangay, postcode, street_address, label]
    );

    res.status(201).json({
      message: 'Shipping address added successfully',
      addressId: result.insertId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete shipping address
exports.deleteShippingAddress = async (req, res) => {
  try {
    await db.query(
      'DELETE FROM user_shipping_details WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Shipping address deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update shipping details
exports.updateShipping = async (req, res) => {
  try {
    const { addressId } = req.body;
    await db.query(
      'UPDATE users SET default_shipping_id = ? WHERE id = ?',
      [addressId, req.user.id]
    );
    res.json({ message: 'Shipping details updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update username
exports.updateUsername = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username } = req.body;
    await db.query(
      'UPDATE users SET username = ? WHERE id = ?',
      [username, req.user.id]
    );
    res.json({ message: 'Username updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete account
exports.deleteAccount = async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.user.id]);
    req.session.destroy();
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check if account can be deleted
exports.canDeleteAccount = async (req, res) => {
  try {
    // Check for any pending orders or other constraints
    const pendingOrders = await db.query(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status IN ("pending", "processing")',
      [req.user.id]
    );

    const canDelete = pendingOrders[0].count === 0;
    res.json({ canDelete });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
