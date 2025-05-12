const jwt = require('jsonwebtoken');
const db = require('../config/db');

const adminAuth = async (req, res, next) => {
  try {
    console.log('AdminAuth middleware started');
    // Get token from header
    const token = req.header('x-auth-token');
    console.log('Token received:', token ? 'Yes' : 'No');
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Verify token
    console.log('Attempting to verify token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', decoded);
    
    // Check if user exists and is admin
    console.log('Checking if user is admin...');
    const [users] = await db.query(
      'SELECT * FROM users WHERE user_id = ? AND user_type = ?',
      [decoded.user.id, 'admin']
    );
    console.log('Users found:', users.length);
    
    if (users.length === 0) {
      console.log('User not authorized as admin');
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
    
    req.user = decoded.user;
    console.log('Admin auth successful');
    next();
  } catch (err) {
    console.error('AdminAuth error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = { adminAuth }; 