const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const passport = require('passport');

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
    const userId = req.user?.id || req.user?.user?.id;
    console.log('Fetching user profile for /me endpoint:', userId);
    
    if (!userId) {
      console.error('No user ID found in token payload:', req.user);
      return res.status(401).json({ message: 'Invalid user token structure' });
    }
    
    // Get a connection from the pool
    const connection = await db.getConnection();
    console.log('Database connection acquired');
    
    try {
      const [users] = await connection.query(
        'SELECT user_id, first_name, last_name, email, phone, address, user_type, status FROM users WHERE user_id = ?',
        [userId]
      );
      
      connection.release();
      console.log('Database connection released');
      
      if (!users || users.length === 0) {
        console.log('User not found:', userId);
        return res.status(404).json({ message: 'User not found' });
      }
      
      const user = users[0];
      console.log('User found, returning profile data');
      
      res.json({
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        userType: user.user_type,
        status: user.status
      });
    } catch (dbError) {
      connection.release();
      console.error('Database query error:', dbError);
      throw dbError;
    }
  } catch (err) {
    console.error('Error in /me endpoint:', {
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

// Add a new route for token refresh
router.post('/refresh', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if decoded token has valid user information
    if (!decoded.user || !decoded.user.id) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    // Fetch latest user info from database
    const [users] = await db.query(
      'SELECT user_id, first_name, last_name, email, user_type, status FROM users WHERE user_id = ?',
      [decoded.user.id]
    );
    
    if (users.length === 0 || users[0].status !== 'Active') {
      return res.status(401).json({ message: 'User not found or inactive' });
    }
    
    const user = users[0];
    
    // Create a new token with renewed expiration
    const payload = {
      user: {
        id: user.user_id,
        userType: user.user_type
      }
    };
    
    // Sign a new token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, newToken) => {
        if (err) {
          console.error('Token signing error:', err);
          return res.status(500).json({ message: 'Error refreshing token' });
        }
        
        // Return the new token
        res.json({
          token: newToken,
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
    console.error('Token refresh error:', err);
    // If the token is expired or invalid, return 401
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
});

// Social Authentication Routes

// Google Authentication
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Log the user object for debugging
    console.log('Google auth callback - User object:', req.user);
    
    // Generate JWT token for the authenticated user
    const payload = {
      user: {
        id: req.user.user_id,
        userType: req.user.user_type || 'Customer'  // Ensure correct casing
      }
    };
    
    console.log('Google auth callback - Token payload:', payload);
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) {
          console.error('Token signing error:', err);
          return res.redirect(`${process.env.CLIENT_URL}/login?error=token_error`);
        }
        // Log the generated token
        console.log('Google auth callback - Generated token:', token.substring(0, 20) + '...');
        // Redirect to client with token
        res.redirect(`${process.env.CLIENT_URL}/social-auth-success?token=${token}`);
      }
    );
  }
);

// Facebook Authentication
router.get('/facebook', (req, res, next) => {
  const { access_token } = req.query;
  
  if (access_token) {
    // If we have an access token, use it for authentication
    passport.authenticate('facebook-token', {
      access_token,
      session: false
    })(req, res, next);
  } else {
    // Otherwise, initiate the Facebook login flow
    passport.authenticate('facebook', {
      scope: ['email', 'public_profile']
    })(req, res, next);
  }
});

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    // Generate JWT token for the authenticated user
    const payload = {
      user: {
        id: req.user.user_id,
        userType: req.user.user_type
      }
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) {
          console.error('Token signing error:', err);
          return res.redirect(`${process.env.CLIENT_URL}/login?error=token_error`);
        }
        // Redirect to client with token
        res.redirect(`${process.env.CLIENT_URL}/social-auth-success?token=${token}`);
      }
    );
  }
);

module.exports = router; 