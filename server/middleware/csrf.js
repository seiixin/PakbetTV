const crypto = require('crypto');

// In-memory storage for CSRF tokens (in production, use Redis)
const csrfTokens = new Map();
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

// Generate CSRF token
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Clean expired tokens
const cleanExpiredTokens = () => {
  const now = Date.now();
  for (const [token, data] of csrfTokens.entries()) {
    if (now - data.created > TOKEN_EXPIRY) {
      csrfTokens.delete(token);
    }
  }
};

// Generate and store CSRF token
const csrfTokenGenerator = (req, res, next) => {
  // Skip CSRF for GET requests and certain endpoints
  if (req.method === 'GET' || req.path.startsWith('/api/auth/google') || req.path.startsWith('/api/auth/facebook')) {
    return next();
  }

  const token = generateCSRFToken();
  const sessionId = req.sessionID || req.ip;
  
  csrfTokens.set(token, {
    sessionId,
    created: Date.now()
  });

  // Set token in response headers
  res.set('X-CSRF-Token', token);
  res.locals.csrfToken = token;
  
  next();
};

// Verify CSRF token
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests, OPTIONS, and certain endpoints
  if (req.method === 'GET' || 
      req.method === 'OPTIONS' || 
      req.path.startsWith('/api/auth/google') || 
      req.path.startsWith('/api/auth/facebook') ||
      req.path === '/health' ||
      req.path === '/transaction-complete') {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionId = req.sessionID || req.ip;

  if (!token) {
    return res.status(403).json({ message: 'CSRF token missing' });
  }

  const tokenData = csrfTokens.get(token);
  
  if (!tokenData) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }

  if (tokenData.sessionId !== sessionId) {
    return res.status(403).json({ message: 'CSRF token mismatch' });
  }

  if (Date.now() - tokenData.created > TOKEN_EXPIRY) {
    csrfTokens.delete(token);
    return res.status(403).json({ message: 'CSRF token expired' });
  }

  // Token is valid, remove it (one-time use)
  csrfTokens.delete(token);
  
  next();
};

// Clean expired tokens every 30 minutes
setInterval(cleanExpiredTokens, 30 * 60 * 1000);

module.exports = {
  csrfTokenGenerator,
  csrfProtection
}; 