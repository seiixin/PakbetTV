const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
router.post(
  '/signup',
  [
    body('username', 'Username is required').not().isEmpty(),
    body('firstname', 'First name is required').not().isEmpty(),
    body('lastname', 'Last name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { username, firstname, middlename, lastname, email, password } = req.body;
    try {
      const [existingUsers] = await db.query(
        'SELECT user_id FROM users WHERE email = ? OR username = ?',
        [email, username]
      );
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'User already exists with this email or username' });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const [result] = await db.query(
        'INSERT INTO users (username, first_name, last_name, email, password, user_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, firstname, lastname, email, hashedPassword, 'Customer', 'Active']
      );
      res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
      console.error('Signup Error:', err.message);
      res.status(500).json({ message: 'Server error during registration' });
    }
  }
);
router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    try {
      const [users] = await db.query(
        'SELECT user_id, first_name, last_name, email, password, user_type, status FROM users WHERE email = ?',
        [email]
      );
      if (users.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      const user = users[0];
      if (user.status !== 'Active') {
        return res.status(400).json({ message: 'Account is inactive. Please contact support.' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      const payload = {
        user: {
          id: user.user_id,
          userType: user.user_type
        }
      };
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
        (err, token) => {
          if (err) throw err;
          res.json({
            token,
            user: {
              id: user.user_id,
              firstName: user.first_name,
              lastName: user.last_name,
              email: user.email,
              userType: user.user_type
            }
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user.id;
    console.log('Fetching user profile for /me endpoint:', userId);
    
    const [users] = await db.query(
      'SELECT user_id, first_name, last_name, email, phone, address, user_type, status FROM users WHERE user_id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    res.json({
      id: user.user_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      userType: user.user_type,
      status: user.status
    });
  } catch (err) {
    console.error('Error in /me endpoint:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router; 