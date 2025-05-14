const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const passport = require('passport');
const fetch = require('node-fetch');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=google_auth_failed' }),
  (req, res) => {
    try {
      // Generate JWT token
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
            console.error('JWT Sign Error:', err);
            return res.redirect('/login?error=token_generation_failed');
          }
          
          // Redirect to the frontend success page with the token
          res.redirect(`/social-auth-success?token=${token}`);
        }
      );
    } catch (error) {
      console.error('Google Auth Callback Error:', error);
      res.redirect('/login?error=auth_error');
    }
  }
);

// Facebook Authentication
router.get('/facebook', (req, res, next) => {
  const { access_token } = req.query;
  
  if (access_token) {
    // If we have an access token, verify it with Facebook and login/register the user
    console.log('Facebook access token auth requested:', access_token.substring(0, 10) + '...');
    
    // Use Facebook Graph API to get user profile
    fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${access_token}`)
      .then(response => response.json())
      .then(fbProfile => {
        if (fbProfile.error) {
          console.error('Facebook Graph API error:', fbProfile.error);
          return res.status(401).json({ message: 'Invalid Facebook token' });
        }
        
        console.log('Facebook profile retrieved:', {
          id: fbProfile.id,
          name: fbProfile.name,
          email: fbProfile.email || 'No email provided'
        });
        
        // Find or create user based on Facebook ID or email
        db.query(
          'SELECT * FROM users WHERE facebook_id = ? OR email = ?',
          [fbProfile.id, fbProfile.email]
        )
        .then(([users]) => {
          if (users.length > 0) {
            // Existing user found
            const user = users[0];
            
            // If user was found by email but Facebook ID is not set, update it
            if (!user.facebook_id && fbProfile.id) {
              db.query(
                'UPDATE users SET facebook_id = ? WHERE user_id = ?',
                [fbProfile.id, user.user_id]
              ).catch(updateErr => {
                console.error('Error updating Facebook ID:', updateErr);
              });
            }
            
            // Generate JWT token
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
                if (err) {
                  console.error('Token signing error:', err);
                  return res.status(500).json({ message: 'Error creating token' });
                }
                
                // Return the token and user data
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
          } else {
            // Create new user from Facebook profile
            const names = fbProfile.name.split(' ');
            const firstName = names[0] || '';
            const lastName = names.slice(1).join(' ') || '';
            const email = fbProfile.email || `fb_${fbProfile.id}@facebook.com`;
            
            // Generate random password
            const password = Math.random().toString(36).slice(-10);
            bcrypt.hash(password, 10, (err, hashedPassword) => {
              if (err) {
                console.error('Password hashing error:', err);
                return res.status(500).json({ message: 'Error creating user' });
              }
              
              db.query(
                `INSERT INTO users 
                (first_name, last_name, username, email, password, user_type, status, facebook_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  firstName,
                  lastName,
                  `${firstName.toLowerCase()}_${Math.floor(Math.random() * 10000)}`,
                  email,
                  hashedPassword,
                  'Customer',
                  'Active',
                  fbProfile.id
                ]
              )
              .then(([result]) => {
                // Get the newly created user
                return db.query(
                  'SELECT * FROM users WHERE user_id = ?',
                  [result.insertId]
                );
              })
              .then(([newUsers]) => {
                if (newUsers.length === 0) {
                  throw new Error('User creation failed');
                }
                
                const newUser = newUsers[0];
                
                // Generate JWT token
                const payload = {
                  user: {
                    id: newUser.user_id,
                    userType: newUser.user_type
                  }
                };
                
                jwt.sign(
                  payload,
                  process.env.JWT_SECRET,
                  { expiresIn: '24h' },
                  (err, token) => {
                    if (err) {
                      console.error('Token signing error:', err);
                      return res.status(500).json({ message: 'Error creating token' });
                    }
                    
                    // Return the token and user data
                    res.json({
                      token,
                      user: {
                        id: newUser.user_id,
                        firstName: newUser.first_name,
                        lastName: newUser.last_name,
                        email: newUser.email,
                        userType: newUser.user_type
                      }
                    });
                  }
                );
              })
              .catch(dbErr => {
                console.error('Database error:', dbErr);
                res.status(500).json({ message: 'Error creating user', error: dbErr.message });
              });
            });
          }
        })
        .catch(dbErr => {
          console.error('Database error:', dbErr);
          res.status(500).json({ message: 'Database error', error: dbErr.message });
        });
      })
      .catch(err => {
        console.error('Facebook Graph API fetch error:', err);
        res.status(500).json({ message: 'Error connecting to Facebook' });
      });
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

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!user.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to database
    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
      [resetToken, resetTokenExpires, email]
    );

    // Create reset password URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Send email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #A2201A; padding: 24px; text-align: center;">
            <h1 style="color: #FFFFFF; margin: 0;">Reset Your Password</h1>
          </div>
          <div style="padding: 32px; background-color: #FFFFFF; border: 1px solid #ddd;">
            <h2 style="color: #A2201A; margin-top: 0;">Hello,</h2>
            <p>You recently requested to reset your password. Click the button below to proceed:</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #FEC16E; 
                        color: #000000; 
                        padding: 12px 28px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
            <p>This link will expire in 1 hour.</p>
          </div>
          <div style="padding: 16px; text-align: center; font-size: 12px; color: #666666;">
            © 2025 PakBet TV - Feng Shui by Michael de Mesa. All rights reserved.
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
});

// Verify reset token
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const [user] = await db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (!user.length) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Valid reset token' });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Error verifying reset token' });
  }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Verify token and get user
    const [user] = await db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (!user.length) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE user_id = ?',
      [hashedPassword, user[0].user_id]
    );

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router; 