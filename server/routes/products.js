const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth, admin } = require('../middleware/auth');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/variants');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// @route   POST api/products
// @desc    Create a new product
// @access  Private/Admin
router.post('/', [auth, admin, 
  body('name', 'Name is required').notEmpty(),
  body('product_code', 'Product code is required').notEmpty(),
  body('category_id', 'Category ID is required').isNumeric()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, product_code, description, category_id } = req.body;

    // Check if product code already exists
    const [existingProducts] = await db.query('SELECT * FROM products WHERE product_code = ?', [product_code]);
    if (existingProducts.length > 0) {
      return res.status(400).json({ message: 'Product code already exists' });
    }

    // Insert new product
    const [result] = await db.query(
      'INSERT INTO products (name, product_code, description, category_id) VALUES (?, ?, ?, ?)',
      [name, product_code, description || null, category_id]
    );

    res.status(201).json({
      message: 'Product created successfully',
      product: {
        product_id: result.insertId,
        name,
        product_code,
        description,
        category_id
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/products/:id/variants
// @desc    Add a product variant
// @access  Private/Admin
router.post('/:id/variants', [auth, admin, upload.single('image')],
  [
    body('sku', 'SKU is required').notEmpty(),
    body('price', 'Price is required and must be a number').isNumeric(),
    body('stock', 'Stock quantity is required and must be a number').isNumeric(),
    body('size', 'Size is required').notEmpty(),
    body('color', 'Color is required').notEmpty(),
    body('weight', 'Weight is required and must be a number').isNumeric(),
    body('height', 'Height is required and must be a number').isNumeric(),
    body('width', 'Width is required and must be a number').isNumeric()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const productId = req.params.id;
      const { sku, price, stock, size, color, weight, height, width } = req.body;

      // Check if product exists
      const [products] = await db.query('SELECT * FROM products WHERE product_id = ?', [productId]);
      if (products.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check if SKU already exists
      const [existingVariants] = await db.query('SELECT * FROM product_variants WHERE sku = ?', [sku]);
      if (existingVariants.length > 0) {
        return res.status(400).json({ message: 'SKU already exists' });
      }

      // Get image path
      let imagePath = null;
      if (req.file) {
        imagePath = `variants/${req.file.filename}`;
      }

      // Insert new variant
      const [result] = await db.query(
        'INSERT INTO product_variants (product_id, sku, price, stock, size, color, weight, height, width, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [productId, sku, price, stock, size, color, weight, height, width, imagePath]
      );

      // If stock is added, record in inventory
      if (stock > 0) {
        await db.query(
          'INSERT INTO inventory (variant_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)',
          [result.insertId, 'add', stock, 'Initial stock']
        );
      }

      res.status(201).json({
        message: 'Product variant added successfully',
        variant: {
          variant_id: result.insertId,
          product_id: productId,
          sku,
          price,
          stock,
          size,
          color,
          weight,
          height,
          width,
          image_url: imagePath
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET api/products
// @desc    Get all products with pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const category = req.query.category;
    
    let query = `
      SELECT p.*, c.name AS category_name, 
        (SELECT COUNT(*) FROM product_variants WHERE product_id = p.product_id) AS variant_count, 
        (SELECT SUM(stock) FROM product_variants WHERE product_id = p.product_id) AS total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
    `;
    
    const countQuery = 'SELECT COUNT(*) AS total FROM products';
    
    const queryParams = [];
    let countQueryParams = [];
    
    // Add category filter if provided
    if (category) {
      query += ' WHERE p.category_id = ?';
      countQuery += ' WHERE category_id = ?';
      queryParams.push(category);
      countQueryParams.push(category);
    }
    
    // Add sorting and pagination
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);
    
    // Execute queries
    const [products] = await db.query(query, queryParams);
    const [countResult] = await db.query(countQuery, countQueryParams);
    
    const totalProducts = countResult[0].total;
    const totalPages = Math.ceil(totalProducts / limit);
    
    res.json({
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalProducts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/products/:id
// @desc    Get product by ID with variants
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Get product details
    const [products] = await db.query(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.product_id = ?
    `, [productId]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get product variants
    const [variants] = await db.query('SELECT * FROM product_variants WHERE product_id = ?', [productId]);
    
    // Return product with variants
    res.json({
      ...products[0],
      variants
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT api/products/:id
// @desc    Update product
// @access  Private/Admin
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, description, category_id } = req.body;
    
    // Check if product exists
    const [products] = await db.query('SELECT * FROM products WHERE product_id = ?', [productId]);
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Create an object with the fields to update
    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category_id) updates.category_id = category_id;
    
    // If there's nothing to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No update data provided' });
    }
    
    // Create SQL query with dynamic fields
    let sql = 'UPDATE products SET ';
    const values = [];
    
    Object.keys(updates).forEach((key, index) => {
      sql += `${key} = ?`;
      if (index < Object.keys(updates).length - 1) {
        sql += ', ';
      }
      values.push(updates[key]);
    });
    
    sql += ' WHERE product_id = ?';
    values.push(productId);
    
    // Execute the update
    const [result] = await db.query(sql, values);
    
    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT api/products/variants/:id
// @desc    Update product variant
// @access  Private/Admin
router.put('/variants/:id', [auth, admin, upload.single('image')], async (req, res) => {
  try {
    const variantId = req.params.id;
    const { price, stock, size, color, weight, height, width } = req.body;
    
    // Check if variant exists and get current stock
    const [variants] = await db.query('SELECT * FROM product_variants WHERE variant_id = ?', [variantId]);
    if (variants.length === 0) {
      return res.status(404).json({ message: 'Variant not found' });
    }
    
    const currentVariant = variants[0];
    
    // Create an object with the fields to update
    const updates = {};
    if (price) updates.price = price;
    if (size) updates.size = size;
    if (color) updates.color = color;
    if (weight) updates.weight = weight;
    if (height) updates.height = height;
    if (width) updates.width = width;
    
    // Handle image update if provided
    if (req.file) {
      updates.image_url = `variants/${req.file.filename}`;
      
      // Delete old image if exists
      if (currentVariant.image_url) {
        const oldImagePath = path.join(__dirname, '../uploads', currentVariant.image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    // Handle stock changes
    if (stock !== undefined) {
      const stockDifference = parseInt(stock) - currentVariant.stock;
      updates.stock = stock;
      
      // Record inventory change if stock is modified
      if (stockDifference !== 0) {
        const changeType = stockDifference > 0 ? 'add' : 'remove';
        const quantity = Math.abs(stockDifference);
        
        await db.query(
          'INSERT INTO inventory (variant_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)',
          [variantId, changeType, quantity, 'Stock adjustment']
        );
      }
    }
    
    // If there's nothing to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No update data provided' });
    }
    
    // Create SQL query with dynamic fields
    let sql = 'UPDATE product_variants SET ';
    const values = [];
    
    Object.keys(updates).forEach((key, index) => {
      sql += `${key} = ?`;
      if (index < Object.keys(updates).length - 1) {
        sql += ', ';
      }
      values.push(updates[key]);
    });
    
    sql += ' WHERE variant_id = ?';
    values.push(variantId);
    
    // Execute the update
    const [result] = await db.query(sql, values);
    
    res.json({ message: 'Product variant updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE api/products/:id
// @desc    Delete product and its variants
// @access  Private/Admin
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Get all variants to delete their images
    const [variants] = await db.query('SELECT * FROM product_variants WHERE product_id = ?', [productId]);
    
    // Delete product (foreign key constraints will delete variants)
    const [result] = await db.query('DELETE FROM products WHERE product_id = ?', [productId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Delete variant images
    for (const variant of variants) {
      if (variant.image_url) {
        const imagePath = path.join(__dirname, '../uploads', variant.image_url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    }
    
    res.json({ message: 'Product and its variants deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 