const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth, admin } = require('../middleware/auth');

// @route   POST api/users
// @desc    Register a new user
// @access  Public
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
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, username, email, password, phone, address } = req.body;

    try {
      // Check if user already exists
      const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insert new user
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

// @route   GET api/users
// @desc    Get all users
// @access  Private/Admin
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

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if the requesting user is authorized to view this user's information
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

// @route   PUT api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if the requesting user is authorized to update this user's information
    if (req.user.user.userType !== 'admin' && req.user.user.id !== parseInt(userId)) {
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }

    const { firstName, lastName, phone, address } = req.body;

    // Create an object with the fields to update
    const updates = {};
    if (firstName) updates.first_name = firstName;
    if (lastName) updates.last_name = lastName;
    if (phone) updates.phone = phone;
    if (address) updates.address = address;

    // Only allow admins to update status and user_type
    if (req.user.user.userType === 'admin') {
      if (req.body.status) updates.status = req.body.status;
      if (req.body.userType) updates.user_type = req.body.userType;
    }

    // If there's nothing to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No update data provided' });
    }

    // Create SQL query with dynamic fields
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

    // Execute the update
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

// @route   DELETE api/users/:id
// @desc    Delete user
// @access  Private/Admin
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

module.exports = router; 