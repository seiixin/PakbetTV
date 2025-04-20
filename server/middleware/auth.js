const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

// Middleware to authenticate JWT tokens
const auth = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.header('Authorization');

  // Check if Authorization header exists and starts with Bearer
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Auth Error: No Bearer token found in Authorization header');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Extract token (remove 'Bearer ')
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user from payload
    req.user = decoded; // This contains { user: { id: ..., username: ..., userType: ... } }
    console.log('Token verified, user attached:', req.user);
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user is admin
const admin = (req, res, next) => {
  if (req.user && req.user.userType === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

module.exports = { auth, admin }; 