const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const auth = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  // Log the incoming request for debugging
  console.log(`Auth: ${req.method} ${req.path}`);

  // Skip auth for certain endpoints if needed
  // const publicEndpoints = ['/api/products', '/api/categories'];
  // if (publicEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
  //   return next();
  // }

  if (!authHeader) {
    console.log('Auth Error: No Authorization header');
    return res.status(401).json({ message: 'No authorization header, authentication required' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.log('Auth Error: Invalid Authorization header');
    return res.status(401).json({ message: 'Invalid authorization format, Bearer token required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    console.log('Processing token:', token.substring(0, 10) + '...');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token for user:', decoded.id || decoded.user_id);
    
    // Check for either id or user_id in token
    const userId = decoded.id || decoded.user_id;
    if (!userId) {
      console.log('Auth Error: No user ID in token');
      return res.status(401).json({ message: 'Invalid token - missing user ID' });
    }
    
    // Set user object with consistent structure
    req.user = {
      id: userId,
      email: decoded.email,
      userType: decoded.userType || 'customer'
    };
    
    console.log(`Token OK: ${req.user.id}, ${req.user.userType}`);
    
    next();
  } catch (err) {
    console.error('Token verification error:', {
      name: err.name,
      message: err.message
    });
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    
    res.status(401).json({ 
      message: 'Token verification failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

const admin = (req, res, next) => {
  console.log(`Admin check for user: ${req.user?.id}, ${req.user?.userType}`);

  if (!req.user) {
    console.log('Admin Error: No user object');
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Case-insensitive check for admin rights
  if (req.user.userType?.toLowerCase() === 'admin') {
    console.log('Admin access granted');
    next();
  } else {
    console.log('Admin Error: Not admin');
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

module.exports = { auth, admin };