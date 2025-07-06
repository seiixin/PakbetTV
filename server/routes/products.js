const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, admin } = require('../middleware/auth');
const productsController = require('../controllers/productsController');

router.post('/', productsController.handleCombinedUpload, [
  body('name', 'Name is required').notEmpty(),
  body('description', 'Description is required').notEmpty(),
  body('price')
    .custom((value) => {
      if (!isNaN(value)) {
        return true;
      }
      if (typeof value === 'string' && value.includes('-')) {
        const [min, max] = value.split('-');
        if (!isNaN(min) && !isNaN(max) && Number(min) <= Number(max)) {
          return true;
        }
      }
      throw new Error('Price must be a number or a valid price range (min-max)');
    }),
  body('category_id', 'Category is required').notEmpty(),
], productsController.createProduct);

router.get('/', productsController.getProducts);
router.get('/search', productsController.searchProducts);
router.get('/:id', productsController.getProductById);
router.put('/:id', productsController.handleCombinedUpload, productsController.updateProduct);
router.delete('/:id', productsController.deleteProduct);
router.delete('/images/:imageId', productsController.deleteProductImage);

// Serve product image
router.get('/image/:id', productsController.serveProductImage);

module.exports = router; 