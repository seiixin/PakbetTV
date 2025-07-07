const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const authController = require('../controllers/authController');
const passport = require('passport');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Limiter for signup and login
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/signup', limiter, [
    body('username', 'Username is required').not().isEmpty(),
    body('firstname', 'First name is required').not().isEmpty(),
    body('lastname', 'Last name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], authController.signup);

router.post('/login', limiter, [
    body('emailOrUsername', 'Email or username is required').exists(),
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

router.post('/forgot-password', authController.forgotPassword);
router.get('/verify-reset-token/:token', authController.verifyResetToken);
router.post('/reset-password/:token', authController.resetPassword);
router.put('/update-password', auth, [
  body('currentPassword', 'Current password is required').exists(),
  body('newPassword', 'Please enter a new password with 6 or more characters').isLength({ min: 6 })
], authController.updatePassword);

// Catch-all for malformed OAuth redirect URLs
router.get('*/social-auth-success', authController.malformedSocialAuthSuccess);
router.get('/google/michaeldemesa.com/social-auth-success', authController.specificMalformedGoogleAuth);

module.exports = router; 