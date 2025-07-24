const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, admin } = require('../middleware/auth');
const vouchersController = require('../controllers/vouchersController');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/vouchers/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'voucher-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Admin routes (require admin authentication)
router.post('/', [
  body('name', 'Voucher name is required').notEmpty(),
  body('type', 'Voucher type is required').isIn(['shipping', 'total_price']),
  body('discount_type', 'Discount type is required').isIn(['percentage', 'fixed']),
  body('discount_value', 'Discount value is required').isNumeric(),
  body('start_date', 'Start date is required').isISO8601(),
  body('end_date', 'End date is required').isISO8601(),
  body('min_order_amount', 'Minimum order amount must be a number').optional().isNumeric(),
  body('max_redemptions', 'Maximum redemptions must be a number').optional().isNumeric(),
  body('max_discount', 'Maximum discount must be a number').optional().isNumeric()
], vouchersController.createVoucher);

// Image upload route
router.post('/upload-image', [
  admin,
  upload.single('image')
], vouchersController.uploadVoucherImage);

router.get('/', admin, vouchersController.getAllVouchers);
router.get('/stats', admin, vouchersController.getVoucherStats);
router.get('/:id', admin, vouchersController.getVoucherById);

router.put('/:id', [
  admin,
  body('name', 'Voucher name is required').optional().notEmpty(),
  body('type', 'Voucher type must be shipping or total_price').optional().isIn(['shipping', 'total_price']),
  body('discount_type', 'Discount type must be percentage or fixed').optional().isIn(['percentage', 'fixed']),
  body('discount_value', 'Discount value must be a number').optional().isNumeric(),
  body('start_date', 'Start date must be valid').optional().isISO8601(),
  body('end_date', 'End date must be valid').optional().isISO8601(),
  body('min_order_amount', 'Minimum order amount must be a number').optional().isNumeric(),
  body('max_redemptions', 'Maximum redemptions must be a number').optional().isNumeric(),
  body('max_discount', 'Maximum discount must be a number').optional().isNumeric(),
  body('is_active', 'is_active must be a boolean').optional().isBoolean()
], vouchersController.updateVoucher);

router.delete('/:id', admin, vouchersController.deleteVoucher);

// User routes (require user authentication)
router.post('/validate', [
  auth,
  body('code', 'Voucher code is required').notEmpty(),
  body('order_amount', 'Order amount must be a number').optional().isNumeric()
], vouchersController.validateVoucher);

module.exports = router; 