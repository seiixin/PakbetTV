const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const authController = require('../controllers/authController');
const passport = require('passport');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Limiter for signup and login - More restrictive for auth endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // Reduced from 100 to 20 attempts per 15 minutes
  message: 'Too many authentication attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Custom password validation
const passwordValidation = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

router.post('/signup', limiter, [
    body('username', 'Username is required').not().isEmpty().isLength({ min: 3, max: 30 }).isAlphanumeric(),
    body('firstname', 'First name is required').not().isEmpty().trim().isLength({ min: 1, max: 50 }),
    body('lastname', 'Last name is required').not().isEmpty().trim().isLength({ min: 1, max: 50 }),
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    passwordValidation
], authController.signup);

router.post('/login', limiter, [
    body('emailOrUsername', 'Email or username is required').exists().trim(),
    body('password', 'Password is required').exists()
], authController.login);

router.get('/me', auth, authController.me);
router.post('/refresh', authController.refresh);

// Social Authentication
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
}));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login?error=google_auth_failed' }), authController.googleCallback);
router.get('/facebook', authController.facebookAuth);
router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), authController.facebookCallback);

router.post('/forgot-password', limiter, authController.forgotPassword);
router.get('/verify-reset-token/:token', authController.verifyResetToken);
router.post('/reset-password/:token', [
  passwordValidation
], authController.resetPassword);
router.put('/update-password', auth, [
  body('currentPassword', 'Current password is required').exists(),
  passwordValidation.withMessage('New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character')
], authController.updatePassword);

// Catch-all for malformed OAuth redirect URLs
router.get('*/social-auth-success', authController.malformedSocialAuthSuccess);
router.get('/google/michaeldemesa.com/social-auth-success', authController.specificMalformedGoogleAuth);

module.exports = router; 