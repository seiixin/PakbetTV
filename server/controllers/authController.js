const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const passport = require('passport');
const fetch = require('node-fetch');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Increased from 10 to 100 login attempts per 15 minutes
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.user_id,
      email: user.email,
      userType: user.user_type || 'customer'
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Export all route handlers as named functions
// Each function receives (req, res, next) as arguments

// ... All route handler functions from auth.js go here ...
// For brevity, you will need to move each handler function (signup, login, me, refresh, google, facebook, forgot-password, etc.)
// and export them at the end as named exports.

// Example:
// async function signup(req, res) { ... }
// async function login(req, res) { ... }
// ...
// module.exports = { signup, login, ... };

// Signup handler
exports.signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, firstname, lastname, email, password } = req.body;

    // Check if user exists
    const existingUser = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        errors: [{ msg: 'User already exists' }]
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await db.query(
      'INSERT INTO users (username, first_name, last_name, email, password) VALUES (?, ?, ?, ?, ?)',
      [username, firstname, lastname, email, hashedPassword]
    );

    const token = generateToken({ id: result.insertId, email });

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        username,
        email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login handler
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { emailOrUsername, password } = req.body;

    // Find user with user_type
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [emailOrUsername, emailOrUsername]
    );

    const user = rows[0];
    if (!user) {
      return res.status(400).json({
        errors: [{ msg: 'Invalid credentials' }]
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        errors: [{ msg: 'Invalid credentials' }]
      });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        userType: user.user_type || 'customer'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user
exports.me = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT user_id, username, email, first_name, last_name, user_type FROM users WHERE user_id = ?',
      [req.user.id]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.user_id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      userType: user.user_type || 'customer'
    });
  } catch (err) {
    console.error('Get user profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refresh token
exports.refresh = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await db.query(
      'SELECT user_id, email, user_type FROM users WHERE user_id = ?',
      [decoded.id]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newToken = generateToken(user);
    res.json({ token: newToken });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Google callback
exports.googleCallback = (req, res) => {
  const token = generateToken(req.user);
  res.redirect(`/social-auth-success?token=${token}`);
};

// Facebook authentication
exports.facebookAuth = passport.authenticate('facebook', { scope: ['email'] });

// Facebook callback
exports.facebookCallback = (req, res) => {
  const token = generateToken(req.user);
  res.redirect(`/social-auth-success?token=${token}`);
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [resetToken, resetTokenExpiry, user.id]
    );

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await transporter.sendMail({
      to: email,
      subject: 'Password Reset Request',
      html: `Please click this link to reset your password: <a href="${resetUrl}">${resetUrl}</a>`
    });

    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify reset token
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    const [user] = await db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ?',
      [token, Date.now()]
    );

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Token is valid' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const [user] = await db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ?',
      [token, Date.now()]
    );

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ message: 'Password has been reset' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update password
exports.updatePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const [user] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Handle malformed social auth success
exports.malformedSocialAuthSuccess = (req, res) => {
  res.redirect('/login?error=malformed_oauth_redirect');
};

// Handle specific malformed Google auth
exports.specificMalformedGoogleAuth = (req, res) => {
  res.redirect('/login?error=malformed_google_auth');
};
