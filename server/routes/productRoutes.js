const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { uploadProductImage } = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/category/:category', productController.getProductsByCategory);
router.get('/best-sellers', productController.getBestSellers);
router.get('/flash-deals', productController.getFlashDeals);
router.get('/new-arrivals', productController.getNewArrivals);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Protected routes with authentication
router.post('/', uploadProductImage, productController.createProduct);
router.put('/:id', uploadProductImage, productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router; 