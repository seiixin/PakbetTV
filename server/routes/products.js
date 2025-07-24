const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');

// Front store routes only (no admin routes)
router.get('/', productsController.getProducts);
router.get('/new-arrivals', productsController.getNewArrivals);
router.get('/flash-deals', productsController.getFlashDeals);
router.get('/best-sellers', productsController.getBestSellers);
router.get('/search', productsController.searchProducts);
router.get('/:id', productsController.getProductById);

// Serve product image
router.get('/image/:id', productsController.serveProductImage);

module.exports = router; 