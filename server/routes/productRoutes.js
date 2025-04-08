const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { uploadProductImage } = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/auth');

router.get('/category/:category', productController.getProductsByCategory);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Protected routes with authentication
router.post('/', protect, uploadProductImage, productController.createProduct);
router.put('/:id', protect, uploadProductImage, productController.updateProduct);
router.delete('/:id', protect, productController.deleteProduct);

module.exports = router; 