const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const auth = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  // Log the incoming request for debugging
  console.log('Auth Middleware - Request:', {
    method: req.method,
    path: req.path,
    headers: {
      authorization: authHeader ? 'Bearer [token]' : 'Not provided',
      'content-type': req.header('Content-Type')
    }
  });

  if (!authHeader) {
    console.log('Auth Error: No Authorization header found');
    return res.status(401).json({ message: 'No authorization header, authentication required' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.log('Auth Error: Invalid Authorization header format');
    return res.status(401).json({ message: 'Invalid authorization format, Bearer token required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.user || !decoded.user.id) {
      console.log('Auth Error: Invalid token payload structure');
      return res.status(401).json({ message: 'Invalid token structure' });
    }
    
    // Set a consistent user object structure
    req.user = {
      id: decoded.user.id,
      userType: decoded.user.userType
    };
    
    console.log('Token verified successfully:', {
      userId: req.user.id,
      userType: req.user.userType
    });
    
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
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    res.status(401).json({ message: 'Token verification failed' });
  }
};

const admin = (req, res, next) => {
  console.log('Admin Middleware - Checking permissions for user:', {
    userId: req.user?.id,
    userType: req.user?.userType
  });

  if (!req.user) {
    console.log('Admin Error: No user object found');
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.userType === 'admin') {
    console.log('Admin access granted');
    next();
  } else {
    console.log('Admin Error: Insufficient permissions');
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

module.exports = { auth, admin }; 