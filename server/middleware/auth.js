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
    console.log('Processing token:', token.substring(0, 10) + '...');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token payload:', JSON.stringify(decoded));
    
    // Handle different token payload structures
    let userId, userType;
    
    if (decoded.user && decoded.user.id) {
      // Standard structure
      userId = decoded.user.id;
      userType = decoded.user.userType;
    } else if (decoded.id) {
      // Simplified structure
      userId = decoded.id;
      userType = decoded.userType;
    } else if (decoded.user_id) {
      // Alternative structure
      userId = decoded.user_id;
      userType = decoded.user_type;
    } else {
      console.log('Auth Error: Could not extract user ID from token');
      return res.status(401).json({ message: 'Invalid token structure - no user ID found' });
    }
    
    // Set user object with consistent structure
    req.user = {
      id: userId,
      userType: (userType || 'Customer').charAt(0).toUpperCase() + (userType || 'Customer').slice(1).toLowerCase() // Normalize case to 'Customer'
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

  // Case-insensitive check for admin rights
  if (req.user.userType.toLowerCase() === 'admin') {
    console.log('Admin access granted');
    next();
  } else {
    console.log('Admin Error: Insufficient permissions');
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

module.exports = { auth, admin }; 