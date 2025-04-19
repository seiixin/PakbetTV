const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth, admin } = require('../middleware/auth');

// --- NEW: Storage configuration for PRODUCT images ---
const productImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/products'); // New directory
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// --- NEW: Multer instance for PRODUCT images ---
const imageFileFilter = (req, file, cb) => {
  // Accept only images
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) { // Case-insensitive match
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const uploadProductImages = multer({
  storage: productImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
  fileFilter: imageFileFilter
});

// --- EXISTING: Storage configuration for VARIANT images ---
const variantImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/variants');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'variant-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// --- EXISTING: Multer instance for VARIANT images ---
const uploadVariantImage = multer({
  storage: variantImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFileFilter
});

// @route   POST api/products
// @desc    Create a new product with multiple images
// @access  Private/Admin (AUTH REMOVED FOR TESTING)
// --- REMOVED: auth, admin middleware ---
router.post('/', [uploadProductImages.array('productImages', 10)], [ // Allow up to 10 images
  body('name', 'Name is required').notEmpty(),
  body('product_code', 'Product code is required').notEmpty(),
  body('category_id', 'Category ID is required').isNumeric(),
  // Add validation for other product fields if necessary
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // If validation fails, delete any uploaded files
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, err => {
          if (err) console.error("Error deleting uploaded file on validation fail:", file.path, err);
        });
      });
    }
    return res.status(400).json({ errors: errors.array() });
  }

  const connection = await db.getConnection(); // Use connection for transaction
  try {
    await connection.beginTransaction();

    const { name, product_code, description, category_id } = req.body;

    // Check if product code already exists
    const [existingProducts] = await connection.query('SELECT product_id FROM products WHERE product_code = ?', [product_code]);
    if (existingProducts.length > 0) {
      await connection.rollback(); // Rollback transaction
      // Delete uploaded files if product code exists
      if (req.files) {
          req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(400).json({ message: 'Product code already exists' });
    }

    // Insert new product (without images first)
    const [result] = await connection.query(
      'INSERT INTO products (name, product_code, description, category_id) VALUES (?, ?, ?, ?)',
      [name, product_code, description || null, category_id]
    );
    const productId = result.insertId;

    // Insert product images if files were uploaded
    if (req.files && req.files.length > 0) {
      const imageValues = req.files.map((file, index) => [
        productId,
        `products/${file.filename}`, // Store relative path
        file.originalname, // Use original name as alt text placeholder
        index // Use index as sort order
      ]);
      await connection.query(
        'INSERT INTO product_images (product_id, image_url, alt_text, sort_order) VALUES ?',
        [imageValues] // Bulk insert
      );
    }

    await connection.commit(); // Commit transaction

    // Fetch the newly created product with its images to return
    const [newProductData] = await connection.query('SELECT * FROM products WHERE product_id = ?', [productId]);
    const [newProductImages] = await connection.query('SELECT image_url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order', [productId]);


    res.status(201).json({
      message: 'Product created successfully',
      product: {
        ...newProductData[0],
        images: newProductImages // Include images in response
      }
    });
  } catch (err) {
    await connection.rollback(); // Rollback transaction on error
     // Delete uploaded files on error
    if (req.files) {
        req.files.forEach(file => {
             try { fs.unlinkSync(file.path); } catch (e) { console.error("Error deleting file on rollback:", e);}
        });
    }
    console.error("Error creating product:", err);
    res.status(500).json({ message: 'Server error during product creation' });
  } finally {
      connection.release(); // Always release connection
  }
});

// @route   POST api/products/:id/variants
// @desc    Add a product variant
// @access  Private/Admin (AUTH REMOVED FOR TESTING)
// --- REMOVED: auth, admin middleware ---
router.post('/:id/variants', [uploadVariantImage.single('image')],
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
  // ... (rest of variant creation logic remains the same) ...
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
       // Clean up uploaded file if validation fails
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ errors: errors.array() });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const productId = req.params.id;
      const { sku, price, stock, size, color, weight, height, width } = req.body;

      // Check if product exists
      const [products] = await connection.query('SELECT product_id FROM products WHERE product_id = ?', [productId]);
      if (products.length === 0) {
         await connection.rollback();
         if (req.file) fs.unlinkSync(req.file.path);
         return res.status(404).json({ message: 'Product not found' });
      }

      // Check if SKU already exists
      const [existingVariants] = await connection.query('SELECT variant_id FROM product_variants WHERE sku = ?', [sku]);
      if (existingVariants.length > 0) {
          await connection.rollback();
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: 'SKU already exists' });
      }

      // Get image path
      let imagePath = null;
      if (req.file) {
        imagePath = `variants/${req.file.filename}`; // Relative path
      }

      // Insert new variant
      const [result] = await connection.query(
        'INSERT INTO product_variants (product_id, sku, price, stock, size, color, weight, height, width, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [productId, sku, price, stock, size, color, weight, height, width, imagePath]
      );
      const variantId = result.insertId;

      // If stock is added, record in inventory
      if (stock > 0) {
        await connection.query(
          'INSERT INTO inventory (variant_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)',
          [variantId, 'add', stock, 'Initial stock']
        );
      }

      await connection.commit();

      res.status(201).json({
        message: 'Product variant added successfully',
        variant: {
          variant_id: variantId,
          product_id: productId,
          sku, price, stock, size, color, weight, height, width,
          image_url: imagePath
        }
      });
    } catch (err) {
      await connection.rollback();
      if (req.file) {
           try { fs.unlinkSync(req.file.path); } catch (e) { console.error("Error deleting variant file on rollback:", e);}
      }
      console.error("Error adding variant:",err);
      res.status(500).json({ message: 'Server error while adding variant' });
    } finally {
        connection.release();
    }
  }
);


// @route   GET api/products
// @desc    Get all products with pagination and images
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const category = req.query.category;

    // Base query to get products
    let productQuery = `
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
    `;
    let countQuery = 'SELECT COUNT(*) AS total FROM products p';
    const queryParams = [];
    let countQueryParams = [];

    // Add category filter if provided
    if (category) {
      const whereClause = ' WHERE p.category_id = ?';
      productQuery += whereClause;
      countQuery += whereClause;
      queryParams.push(category);
      countQueryParams.push(category);
    }

    // Add sorting and pagination
    productQuery += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    // Execute queries
    const [products] = await db.query(productQuery, queryParams);
    const [countResult] = await db.query(countQuery, countQueryParams);

    const totalProducts = countResult[0].total;
    const totalPages = Math.ceil(totalProducts / limit);

    // Get images for the fetched products
    if (products.length > 0) {
        const productIds = products.map(p => p.product_id);
        const [images] = await db.query(
            'SELECT product_id, image_url, alt_text, sort_order FROM product_images WHERE product_id IN (?) ORDER BY product_id, sort_order',
            [productIds]
        );

        // Map images to their respective products
        const imagesMap = images.reduce((map, img) => {
            if (!map[img.product_id]) {
                map[img.product_id] = [];
            }
            // Prepend base path for client consumption if needed, or handle on client
            map[img.product_id].push({ 
                url: `/uploads/${img.image_url}`, 
                alt: img.alt_text, 
                order: img.sort_order 
            });
            return map;
        }, {});

        products.forEach(product => {
            product.images = imagesMap[product.product_id] || [];
        });
    }


    res.json({
      products, // Products now include an 'images' array
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalProducts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: 'Server error while fetching products' });
  }
});

// @route   GET api/products/:id
// @desc    Get product by ID with variants and images
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;

    // Get product details
    const [productResult] = await db.query(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.product_id = ?
    `, [productId]);

    if (productResult.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const product = productResult[0];

    // Get product variants
    const [variants] = await db.query('SELECT * FROM product_variants WHERE product_id = ?', [productId]);

    // Get product images
    const [images] = await db.query(
        'SELECT image_id, image_url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order',
        [productId]
    );

    // Return product with variants and images
    res.json({
      ...product,
      variants,
      // Prepend base path for client consumption if needed, or handle on client
      images: images.map(img => ({ 
          id: img.image_id, 
          url: `/uploads/${img.image_url}`, 
          alt: img.alt_text, 
          order: img.sort_order 
      })) 
    });
  } catch (err) {
    console.error("Error fetching product details:", err);
    res.status(500).json({ message: 'Server error while fetching product details' });
  }
});


// @route   PUT api/products/:id
// @desc    Update product
// @access  Private/Admin (AUTH REMOVED FOR TESTING)
// --- REMOVED: auth, admin middleware ---
router.put('/:id', [uploadProductImages.array('productImages', 10)], async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const productId = req.params.id;
    // Note: When using FormData, boolean/null might come as strings
    const { name, description, category_id, product_code /* Add other fields as needed */ } = req.body;

    // Check if product exists
    const [products] = await connection.query('SELECT product_id FROM products WHERE product_id = ?', [productId]);
    if (products.length === 0) {
      await connection.rollback();
       // Delete uploaded files if product not found
      if (req.files) {
          req.files.forEach(file => {
              try { fs.unlinkSync(file.path); } catch(e) { console.error("Error deleting file on PUT not found:", e);}
          });
      }
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if new product_code conflicts (if provided)
    if (product_code) {
        const [existingCode] = await connection.query(
            'SELECT product_id FROM products WHERE product_code = ? AND product_id != ?',
            [product_code, productId]
        );
        if (existingCode.length > 0) {
            await connection.rollback();
            if (req.files) {
                req.files.forEach(file => {
                    try { fs.unlinkSync(file.path); } catch(e) { console.error("Error deleting file on PUT conflict:", e);}
                });
            }
            return res.status(400).json({ message: 'Product code already exists for another product' });
        }
    }

    // Create an object with the non-image fields to update
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category_id !== undefined) updates.category_id = category_id;
    if (product_code !== undefined) updates.product_code = product_code;
    // Add other updatable fields here, converting from string if necessary

    // Update main product details if any fields were provided
    if (Object.keys(updates).length > 0) {
        await connection.query('UPDATE products SET ? WHERE product_id = ?', [updates, productId]);
    }

    // Add new product images if files were uploaded
    // Note: This doesn't handle deleting old images easily in the same request.
    // Consider a separate endpoint or logic for image deletion/reordering.
    if (req.files && req.files.length > 0) {
      // Get current max sort order
      const [[maxSort]] = await connection.query(
          'SELECT MAX(sort_order) as max_sort FROM product_images WHERE product_id = ?',
          [productId]
      );
      let currentSortOrder = (maxSort.max_sort === null) ? 0 : maxSort.max_sort + 1;

      const imageValues = req.files.map((file) => [
        productId,
        `products/${file.filename}`, // Store relative path
        file.originalname, // Use original name as alt text placeholder
        currentSortOrder++ // Increment sort order
      ]);
      await connection.query(
        'INSERT INTO product_images (product_id, image_url, alt_text, sort_order) VALUES ?',
        [imageValues] // Bulk insert
      );
    }

    await connection.commit();

    // Fetch updated product data to return
    const [updatedProductData] = await connection.query('SELECT * FROM products WHERE product_id = ?', [productId]);
    const [updatedProductImages] = await connection.query('SELECT image_id, image_url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order', [productId]);

    res.json({
        message: 'Product updated successfully',
        product: {
            ...updatedProductData[0],
             // Prepend base path for client consumption
             images: updatedProductImages.map(img => ({ 
                 id: img.image_id, 
                 url: `/uploads/${img.image_url}`, 
                 alt: img.alt_text, 
                 order: img.sort_order 
             }))
        }
    });
  } catch (err) {
    await connection.rollback();
    // Clean up any newly uploaded files on error
    if (req.files) {
        req.files.forEach(file => {
             try { fs.unlinkSync(file.path); } catch (e) { console.error("Error deleting file on update rollback:", e);}
        });
    }
    console.error("Error updating product:", err);
    res.status(500).json({ message: 'Server error during product update' });
  } finally {
      connection.release();
  }
});


// @route   PUT api/products/variants/:id
// @desc    Update product variant
// @access  Private/Admin (AUTH REMOVED FOR TESTING)
// --- REMOVED: auth, admin middleware ---
router.put('/variants/:id', [uploadVariantImage.single('image')], async (req, res) => {
  // ... (rest of variant update logic - check for file deletion on rollback) ...
  const connection = await db.getConnection();
   try {
     await connection.beginTransaction();
     const variantId = req.params.id;
     const { price, stock, size, color, weight, height, width } = req.body;

     // Check if variant exists and get current stock/image
     const [variants] = await connection.query('SELECT * FROM product_variants WHERE variant_id = ?', [variantId]);
     if (variants.length === 0) {
       await connection.rollback();
       if (req.file) fs.unlinkSync(req.file.path); // Clean up uploaded file
       return res.status(404).json({ message: 'Variant not found' });
     }
     const currentVariant = variants[0];

     // Create an object with the fields to update
     const updates = {};
     if (price !== undefined) updates.price = price;
     if (size !== undefined) updates.size = size;
     if (color !== undefined) updates.color = color;
     if (weight !== undefined) updates.weight = weight;
     if (height !== undefined) updates.height = height;
     if (width !== undefined) updates.width = width;

     let oldImagePath = null;
     // Handle image update if provided
     if (req.file) {
       updates.image_url = `variants/${req.file.filename}`;
       oldImagePath = currentVariant.image_url ? path.join(__dirname, '../uploads', currentVariant.image_url) : null;
     }

     // Handle stock changes
     if (stock !== undefined) {
       const stockDifference = parseInt(stock) - currentVariant.stock;
       updates.stock = stock;

       // Record inventory change if stock is modified
       if (stockDifference !== 0) {
         const changeType = stockDifference > 0 ? 'add' : 'remove';
         const quantity = Math.abs(stockDifference);

         await connection.query(
           'INSERT INTO inventory (variant_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)',
           [variantId, changeType, quantity, 'Stock adjustment']
         );
       }
     }

     // If there's nothing to update (besides potentially an image)
     if (Object.keys(updates).length === 0 && !req.file) {
         await connection.rollback(); // No changes, rollback is safe
         return res.status(400).json({ message: 'No update data provided' });
     }

     // Execute the update
     if (Object.keys(updates).length > 0) {
        await connection.query('UPDATE product_variants SET ? WHERE variant_id = ?', [updates, variantId]);
     }

     await connection.commit();

     // Delete old image *after* commit succeeds
     if (oldImagePath && fs.existsSync(oldImagePath)) {
       fs.unlink(oldImagePath, (err) => {
          if (err) console.error("Error deleting old variant image:", oldImagePath, err);
       });
     }

     res.json({ message: 'Product variant updated successfully' });
   } catch (err) {
     await connection.rollback();
     // Clean up newly uploaded file if commit failed
     if (req.file) {
          try { fs.unlinkSync(req.file.path); } catch (e) { console.error("Error deleting new variant file on update rollback:", e);}
     }
     console.error("Error updating variant:", err);
     res.status(500).json({ message: 'Server error while updating variant' });
   } finally {
     connection.release();
   }
});

// @route   DELETE api/products/:id
// @desc    Delete product, its variants, and images
// @access  Private/Admin (AUTH REMOVED FOR TESTING)
// --- REMOVED: auth, admin middleware ---
router.delete('/:id', async (req, res) => {
 const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const productId = req.params.id;

    // 1. Get product variants to delete their images
    const [variants] = await connection.query('SELECT image_url FROM product_variants WHERE product_id = ?', [productId]);

    // 2. Get product images to delete their files
    const [productImages] = await connection.query('SELECT image_url FROM product_images WHERE product_id = ?', [productId]);

    // 3. Delete product from database (cascades should delete variants, product_images, reviews)
    const [result] = await connection.query('DELETE FROM products WHERE product_id = ?', [productId]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    await connection.commit();

    // 4. Delete variant image files *after* successful commit
    for (const variant of variants) {
      if (variant.image_url) {
        const imagePath = path.join(__dirname, '../uploads', variant.image_url);
        if (fs.existsSync(imagePath)) {
          fs.unlink(imagePath, (err) => {
              if (err) console.error("Error deleting variant image file:", imagePath, err);
          });
        }
      }
    }

    // 5. Delete product image files *after* successful commit
    for (const img of productImages) {
        if (img.image_url) {
            const imagePath = path.join(__dirname, '../uploads', img.image_url);
             if (fs.existsSync(imagePath)) {
                fs.unlink(imagePath, (err) => {
                    if (err) console.error("Error deleting product image file:", imagePath, err);
                });
            }
        }
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    await connection.rollback();
    console.error("Error deleting product:", err);
    res.status(500).json({ message: 'Server error during product deletion' });
  } finally {
      connection.release();
  }
});


// --- NEW: Endpoint to delete a specific product image ---
// @route   DELETE api/products/images/:imageId
// @desc    Delete a specific product image
// @access  Private/Admin (AUTH REMOVED FOR TESTING)
// --- REMOVED: auth, admin middleware ---
router.delete('/images/:imageId', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const imageId = req.params.imageId;

        // 1. Find the image record to get the URL
        const [images] = await connection.query('SELECT image_url FROM product_images WHERE image_id = ?', [imageId]);
        if (images.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Image not found' });
        }
        const imageUrl = images[0].image_url;

        // 2. Delete the image record from the database
        const [result] = await connection.query('DELETE FROM product_images WHERE image_id = ?', [imageId]);
        if (result.affectedRows === 0) {
             await connection.rollback(); // Should not happen if found before, but good practice
             return res.status(404).json({ message: 'Image not found during delete attempt' });
        }

        await connection.commit();

        // 3. Delete the actual image file *after* successful commit
        if (imageUrl) {
            const imagePath = path.join(__dirname, '../uploads', imageUrl);
            if (fs.existsSync(imagePath)) {
                fs.unlink(imagePath, (err) => {
                    if (err) console.error("Error deleting product image file:", imagePath, err);
                });
            }
        }

        res.json({ message: 'Product image deleted successfully' });
    } catch (err) {
        await connection.rollback();
        console.error("Error deleting product image:", err);
        res.status(500).json({ message: 'Server error while deleting image' });
    } finally {
        connection.release();
    }
});


module.exports = router; 