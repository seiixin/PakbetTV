const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth, admin } = require('../middleware/auth');

// @route   POST api/categories
// @desc    Create a new category
// @access  Private/Admin
router.post(
  '/',
  [
    //auth,
    //admin,
    body('name', 'Name is required').notEmpty(),
    body('name', 'Name must be between 2 and 100 characters').isLength({ min: 2, max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description, parent_id } = req.body;

      // Check if category name already exists
      const [existingCategories] = await db.query('SELECT * FROM categories WHERE name = ?', [name]);
      if (existingCategories.length > 0) {
        return res.status(400).json({ message: 'Category name already exists' });
      }

      // Check if parent category exists if provided
      if (parent_id) {
        const [parentCategory] = await db.query('SELECT * FROM categories WHERE category_id = ?', [parent_id]);
        if (parentCategory.length === 0) {
          return res.status(400).json({ message: 'Parent category not found' });
        }
      }

      // Insert new category
      const [result] = await db.query(
        'INSERT INTO categories (name, description, parent_id) VALUES (?, ?, ?)',
        [name, description || null, parent_id || null]
      );

      res.status(201).json({
        message: 'Category created successfully',
        category: {
          category_id: result.insertId,
          name,
          description,
          parent_id: parent_id || null
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET api/categories
// @desc    Get all categories with optional parent filter
// @access  Public
router.get('/', async (req, res) => {
  try {
    const parent_id = req.query.parent_id;
    let query = 'SELECT * FROM categories';
    const params = [];

    // Filter by parent_id if provided
    if (parent_id !== undefined) {
      if (parent_id === 'null') {
        query += ' WHERE parent_id IS NULL';
      } else {
        query += ' WHERE parent_id = ?';
        params.push(parent_id);
      }
    }

    // Sort by name
    query += ' ORDER BY name ASC';

    const [categories] = await db.query(query, params);
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/categories/tree
// @desc    Get categories as a hierarchical tree
// @access  Public
router.get('/tree', async (req, res) => {
  try {
    // Get all categories
    const [categories] = await db.query('SELECT * FROM categories ORDER BY name ASC');
    
    // Build hierarchy
    const categoriesMap = {};
    categories.forEach(category => {
      categoriesMap[category.category_id] = { ...category, children: [] };
    });
    
    const rootCategories = [];
    
    categories.forEach(category => {
      if (category.parent_id) {
        categoriesMap[category.parent_id].children.push(categoriesMap[category.category_id]);
      } else {
        rootCategories.push(categoriesMap[category.category_id]);
      }
    });
    
    res.json(rootCategories);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/categories/:id
// @desc    Get category by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    const [categories] = await db.query('SELECT * FROM categories WHERE category_id = ?', [categoryId]);
    
    if (categories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(categories[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT api/categories/:id
// @desc    Update category
// @access  Private/Admin
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description, parent_id } = req.body;
    
    // Check if category exists
    const [categories] = await db.query('SELECT * FROM categories WHERE category_id = ?', [categoryId]);
    if (categories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if category name already exists if updating name
    if (name) {
      const [existingCategories] = await db.query(
        'SELECT * FROM categories WHERE name = ? AND category_id != ?',
        [name, categoryId]
      );
      if (existingCategories.length > 0) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
    }
    
    // Check if parent category exists if provided
    if (parent_id !== undefined && parent_id !== null) {
      // Check for circular reference (category can't be its own parent or descendant)
      if (parseInt(parent_id) === parseInt(categoryId)) {
        return res.status(400).json({ message: 'Category cannot be its own parent' });
      }
      
      const [parentCategory] = await db.query('SELECT * FROM categories WHERE category_id = ?', [parent_id]);
      if (parentCategory.length === 0) {
        return res.status(400).json({ message: 'Parent category not found' });
      }
    }
    
    // Create an object with the fields to update
    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (parent_id !== undefined) updates.parent_id = parent_id === null ? null : parent_id;
    
    // If there's nothing to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No update data provided' });
    }
    
    // Create SQL query with dynamic fields
    let sql = 'UPDATE categories SET ';
    const values = [];
    
    Object.keys(updates).forEach((key, index) => {
      if (updates[key] === null) {
        sql += `${key} = NULL`;
      } else {
        sql += `${key} = ?`;
        values.push(updates[key]);
      }
      
      if (index < Object.keys(updates).length - 1) {
        sql += ', ';
      }
    });
    
    sql += ' WHERE category_id = ?';
    values.push(categoryId);
    
    // Execute the update
    const [result] = await db.query(sql, values);
    
    res.json({ message: 'Category updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE api/categories/:id
// @desc    Delete category
// @access  Private/Admin
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    // Check if category has child categories
    const [childCategories] = await db.query('SELECT * FROM categories WHERE parent_id = ?', [categoryId]);
    if (childCategories.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete category with child categories. Please delete or reassign child categories first.'
      });
    }
    
    // Check if category has associated products
    const [products] = await db.query('SELECT * FROM products WHERE category_id = ?', [categoryId]);
    if (products.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete category with associated products. Please reassign products first.'
      });
    }
    
    // Delete category
    const [result] = await db.query('DELETE FROM categories WHERE category_id = ?', [categoryId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 