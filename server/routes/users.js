const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, admin } = require('../middleware/auth');
const usersController = require('../controllers/usersController');

// Example route definitions (replace with actual handler names after migration):
router.post('/', [
  body('firstName', 'First name is required').notEmpty(),
  body('lastName', 'Last name is required').notEmpty(),
  body('username', 'Username is required').notEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], usersController.registerUser);

router.get('/', [auth, admin], usersController.getAllUsers);
router.get('/shipping-addresses', auth, usersController.getShippingAddresses);
router.put('/profile', auth, [
  body('firstName', 'First name is required').notEmpty(),
  body('lastName', 'Last name is required').notEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('username', 'Username is required').notEmpty()
], usersController.updateProfile);
router.get('/:id', auth, usersController.getUserById);
router.put('/:id', auth, usersController.updateUserById);
router.delete('/:id', [auth, admin], usersController.deleteUserById);
router.get('/profile', auth, usersController.getUserProfile);
router.get('/profile-debug', auth, usersController.profileDebug);
router.post('/shipping-address', auth, [
  body('region').notEmpty().withMessage('Region is required'),
  body('province').notEmpty().withMessage('Province is required'),
  body('city_municipality').notEmpty().withMessage('City/Municipality is required'),
  body('barangay').notEmpty().withMessage('Barangay is required'),
  body('postcode').notEmpty().withMessage('Postal code is required')
], usersController.addOrUpdateShippingAddress);
router.delete('/shipping-address/:id', auth, usersController.deleteShippingAddress);
router.post('/update-shipping', auth, usersController.updateShipping);
router.put('/update-username', auth, [
  body('username', 'Username is required').not().isEmpty()
], usersController.updateUsername);
router.post('/delete-account', auth, usersController.deleteAccount);
router.get('/can-delete-account', auth, usersController.canDeleteAccount);

module.exports = router; 