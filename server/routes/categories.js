const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, admin } = require('../middleware/auth');
const categoriesController = require('../controllers/categoriesController');

router.post('/', [
  body('name', 'Name is required').notEmpty(),
  body('name', 'Name must be between 2 and 100 characters').isLength({ min: 2, max: 100 })
], categoriesController.createCategory);

router.get('/', categoriesController.getCategories);
router.get('/tree', categoriesController.getCategoryTree);
router.get('/:id', categoriesController.getCategoryById);
router.put('/:id', [auth, admin], categoriesController.updateCategory);
router.delete('/:id', [auth, admin], categoriesController.deleteCategory);

module.exports = router; 