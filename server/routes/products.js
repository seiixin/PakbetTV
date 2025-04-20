const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth, admin } = require('../middleware/auth');
const { promisify } = require('util');
const mkdirp = promisify(require('mkdirp'));

// Helper function to create directories if they don't exist
const ensureDir = async (dir) => {
  try {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      await mkdirp(dir);
    }
    return true;
  } catch (err) {
    console.error(`Error creating directory ${dir}:`, err);
    throw err;
  }
};

// Main product images storage configuration
const productStorage = multer.diskStorage({
  destination: async function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/products');
    await ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Variant images storage configuration
const variantStorage = multer.diskStorage({
  destination: async function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/variants');
    await ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'variant-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for image uploads
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if(file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed!'), false);
  }
};

// Configure multer for product images
const uploadProductImages = multer({ 
  storage: productStorage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Configure multer for variant images
const uploadVariantImages = multer({ 
  storage: variantStorage, 
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Configure multer for combined uploads (product and variant images)
const upload = multer({
  storage: multer.diskStorage({
    destination: async function(req, file, cb) {
      try {
        // Use different directories based on field name
        let uploadDir;
        if (file.fieldname === 'productImages') {
          uploadDir = path.join(__dirname, '../uploads/products');
        } else if (file.fieldname === 'variantImages') {
          uploadDir = path.join(__dirname, '../uploads/variants');
        } else {
          uploadDir = path.join(__dirname, '../uploads');
        }
        
        // Create the directory if it doesn't exist
        await ensureDir(uploadDir);
        cb(null, uploadDir);
      } catch (error) {
        console.error('Error creating upload directory:', error);
        cb(error);
      }
    },
    filename: function(req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const prefix = file.fieldname === 'productImages' ? 'product-' : 
                    file.fieldname === 'variantImages' ? 'variant-' : '';
      cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).fields([
  { name: 'productImages', maxCount: 10 },
  { name: 'variantImages', maxCount: 20 }
]);

// Middleware to handle file uploads and data processing
const handleCombinedUpload = async (req, res, next) => {
  console.log('Starting file upload processing...');
  
  upload(req, res, async function (err) {
    if (err) {
      console.error('Multer upload error:', err);
      return res.status(400).json({ message: 'File upload error: ' + err.message });
    }
    
    try {
      // Log received files for debugging
      console.log('Files received:', req.files ? Object.keys(req.files) : 'None');
      
      // Process product images
      if (req.files && req.files.productImages) {
        console.log(`Processing ${req.files.productImages.length} product images`);
        req.productImages = req.files.productImages.map(file => {
          // Get relative path for URL
          const relativePath = path.relative(
            path.join(__dirname, '..'),
            file.path
          ).replace(/\\/g, '/');
          
          return {
            filename: file.filename,
            path: file.path,
            url: relativePath
          };
        });
      } else {
        req.productImages = [];
      }
      
      // Process variant images
      if (req.files && req.files.variantImages) {
        console.log(`Processing ${req.files.variantImages.length} variant images`);
        req.variantImages = req.files.variantImages.map(file => {
          // Get relative path for URL
          const relativePath = path.relative(
            path.join(__dirname, '..'),
            file.path
          ).replace(/\\/g, '/');
          
          return {
            filename: file.filename,
            path: file.path,
            url: relativePath
          };
        });
      } else {
        req.variantImages = [];
      }
      
      next();
    } catch (error) {
      console.error('Error processing uploads:', error);
      return res.status(500).json({ message: 'Error processing uploads' });
    }
  });
};

// @route   POST api/products
// @desc    Create a new product with optional variants
// @access  Private/Admin (AUTH REMOVED FOR TESTING)
// --- REMOVED: auth, admin middleware ---
router.post('/', handleCombinedUpload, [
  body('name', 'Name is required').notEmpty(),
  body('description', 'Description is required').notEmpty(),
  body('price')
    .custom((value) => {
      // Accept single numeric price
      if (!isNaN(value)) {
        return true;
      }
      
      // Accept price range in format "min-max"
      if (typeof value === 'string' && value.includes('-')) {
        const [min, max] = value.split('-');
        if (!isNaN(min) && !isNaN(max) && Number(min) <= Number(max)) {
          return true;
        }
      }
      
      throw new Error('Price must be a number or a valid price range (min-max)');
    }),
  body('category_id', 'Category is required').notEmpty(),
], async (req, res) => {
  // Use db.getConnection() instead of pool.connect()
  const connection = await db.getConnection();
  
  try {
    console.log('Creating new product...');
    console.log('Request body:', req.body);
    console.log('Product images:', req.productImages?.length || 0);
    console.log('Variant images:', req.variantImages?.length || 0);
    
    // Validate required fields
    const { name, price, category_id, description } = req.body;
    
    if (!name || !category_id) {
      return res.status(400).json({ message: 'Product name and category ID are required' });
    }
    
    // Start transaction using connection
    await connection.query('BEGIN');
    
    // Generate product code if not provided
    let productCode = req.body.product_code;
    if (!productCode) {
      // Use connection for queries with ? placeholders
      const seqResult = await connection.query(
        `SELECT MAX(CAST(SUBSTRING(product_code FROM LOCATE('-', product_code) + 1) AS INTEGER)) AS max_seq 
         FROM products WHERE category_id = ?`,
        [category_id]
      );
      const maxSeq = seqResult[0][0].max_seq || 0; // mysql2 returns nested array
      const newSeq = maxSeq + 1;
      
      // Query for category name instead of trying to use a non-existent 'code' column
      const catResult = await connection.query(
        'SELECT name FROM categories WHERE category_id = ?',
        [category_id]
      );
      if (catResult[0].length === 0) { // Check nested array
        throw new Error('Invalid category ID');
      }
      
      // Create category code from the first 3 letters of category name
      const categoryName = catResult[0][0].name;
      const categoryCode = categoryName.substring(0, 3).toUpperCase();
      productCode = `${categoryCode}-${String(newSeq).padStart(3, '0')}`; // Ensure padding
      console.log(`Generated product code: ${productCode}`);
    }
    
    // Check for variants
    const includeVariants = req.body.include_variants === 'true';
    let variants = [];
    
    if (includeVariants && req.body.variants) {
      try {
        variants = JSON.parse(req.body.variants);
        console.log(`Parsed ${variants.length} variants`);
      } catch (error) {
        console.error('Error parsing variants JSON:', error);
        return res.status(400).json({ message: 'Invalid variants format' });
      }
    }
    
    // Insert product using connection with ? placeholders
    const [productInsertResult] = await connection.query( // Destructure result for mysql2
      `INSERT INTO products (
        product_code, name, description, category_id
      ) VALUES (?, ?, ?, ?)`, 
      [productCode, name, description || '', category_id]
    );
    const productId = productInsertResult.insertId; // Get insertId from result
    console.log(`Product created with ID: ${productId}`);
    
    // Insert product images using connection with ? placeholders
    if (req.productImages && req.productImages.length > 0) {
      for (let i = 0; i < req.productImages.length; i++) {
        await connection.query(
          'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)', // Corrected column name to sort_order
          [productId, req.productImages[i].url, i]
        );
      }
    }
    
    // Insert variants and their images using connection with ? placeholders
    if (variants.length > 0) {
      let imageIndex = 0; // Initialize index for variant images
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        // Insert variant using connection with ? placeholders
        const [variantInsertResult] = await connection.query(
          `INSERT INTO product_variants (
            product_id, size, color, price, stock, sku, weight, height, width
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [productId, variant.size || '', variant.color || '', variant.price || 0, variant.stock || 0, variant.sku, variant.weight || 0, variant.height || 0, variant.width || 0]
        );
        const variantId = variantInsertResult.insertId; // Get insertId
        console.log(`Created variant with ID: ${variantId}`);

        // Update variant image URL using connection with ? placeholders, using imageIndex
        if (variant.has_image && req.variantImages && imageIndex < req.variantImages.length) {
          const variantImage = req.variantImages[imageIndex]; // Get image based on imageIndex
          await connection.query(
            'UPDATE product_variants SET image_url = ? WHERE variant_id = ?',
            [variantImage.url, variantId]
          );
          imageIndex++; // Increment index only when an image is used
        }
      }
    }
    
    // Commit transaction using connection
    await connection.query('COMMIT');
    
    // Return success
    res.status(201).json({ 
      message: 'Product created successfully',
      product: { 
        product_id: productId,
        product_code: productCode,
        variants_count: variants.length
      }
    });
    
  } catch (error) {
    // Rollback using connection
    await connection.query('ROLLBACK');
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Error creating product: ' + error.message });
  } finally {
    // Release the connection
    connection.release();
  }
});

// @route   GET api/products
// @desc    Get all products with pagination and images
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const category = req.query.category;
    
    // --- MODIFIED QUERY to fetch MIN variant price --- 
    let productQuery = `
      SELECT 
        p.*, 
        c.name AS category_name,
        -- Use MIN variant price if variants exist, otherwise use base product price
        COALESCE(MIN(pv.price), p.price) as display_price 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      -- Join to find the minimum variant price
      LEFT JOIN product_variants pv ON p.product_id = pv.product_id 
    `;
    // Base count query remains similar but doesn't need variant join
    let countQuery = 'SELECT COUNT(*) AS total FROM products p';
    const queryParams = [];
    let countQueryParams = [];
    
    // Add category filter if provided
    if (category) {
      const whereClause = ' WHERE p.category_id = ?';
      // Add WHERE to productQuery (before GROUP BY)
      productQuery += whereClause;
      countQuery += whereClause;
      queryParams.push(category);
      countQueryParams.push(category);
    }
    
    // --- Add GROUP BY for the aggregate function --- 
    productQuery += ' GROUP BY p.product_id, c.name'; // Group by product id and other non-aggregated selected columns

    // Add sorting and pagination with ? placeholders
    productQuery += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);
    
    // Execute queries using db.query
    const [products] = await db.query(productQuery, queryParams);
    const [countResult] = await db.query(countQuery, countQueryParams);
    
    const totalProducts = countResult[0].total;
    const totalPages = Math.ceil(totalProducts / limit);

    // Get images for the fetched products using ? placeholder
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
            // Check if image_url exists before processing
            if (img.image_url) {
              map[img.product_id].push({
                  url: img.image_url.startsWith('uploads/') ? `/${img.image_url}` : `/uploads/${img.image_url}`,
                  alt: img.alt_text,
                  order: img.sort_order
              });
            }
            return map;
        }, {});

        products.forEach(product => {
            product.images = imagesMap[product.product_id] || [];
            // --- IMPORTANT: Use display_price for consistency --- 
            product.price = product.display_price; // Overwrite base price with calculated display_price
            delete product.display_price; // Optional: remove temporary column
        });
    }

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
    
    // Get product details using ? placeholder
    const [productResult] = await db.query(`
      SELECT 
        p.product_id, p.name, p.product_code, p.description, p.category_id, 
        p.price, p.stock AS stock_quantity, p.created_at, p.updated_at,
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.product_id = ?
    `, [productId]);
    
    if (productResult.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const product = productResult[0];
    
    // Get product variants using ? placeholder
    const [variants] = await db.query('SELECT * FROM product_variants WHERE product_id = ?', [productId]);
    
    // Map variants with additional information
    const variantsWithDetails = [];
    for (const variant of variants) {
      // Get variant image if available
      let variantImage = null;
      if (variant.image_url) {
        variantImage = {
          id: `variant-img-${variant.variant_id}`,
          url: `/uploads/${variant.image_url}`,
          alt: `${product.name} - ${variant.color} ${variant.size}`,
          order: 0
        };
      }
      
      variantsWithDetails.push({
        ...variant,
        parent_product_id: productId,
        images: variantImage ? [variantImage] : [],
        name: `${product.name} - ${variant.color} ${variant.size}`
      });
    }
    
    // Get product images using ? placeholder
    const [images] = await db.query(
        'SELECT image_id, image_url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order', // Use sort_order
        [productId]
    );

    // Return product with variants and images
    res.json({
      ...product,
      variants: variantsWithDetails,
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
router.put('/:id', handleCombinedUpload, async (req, res) => {
  const { id } = req.params;
  // Use db.getConnection() instead of pool.connect()
  const connection = await db.getConnection();
  
  try {
    console.log(`Updating product ${id}...`);
    console.log('Request body:', req.body);
    console.log('Product images:', req.productImages?.length || 0);
    console.log('Variant images:', req.variantImages?.length || 0);
    
    // Validate required fields
    const { name, category_id } = req.body;
    
    if (!name || !category_id) {
      return res.status(400).json({ message: 'Product name and category ID are required' });
    }
    
    // Start transaction using connection
    await connection.query('BEGIN');
    
    // Update product using connection with ? placeholders
    await connection.query(
      `UPDATE products SET
        name = ?, description = ?, price = ?, stock = ?, category_id = ?,
        weight = ?, height = ?, width = ?, length = ?, is_featured = ?,
        updated_at = NOW()
      WHERE product_id = ?`,
      [name, req.body.description || '', req.body.price || 0, req.body.stock || 0, category_id, req.body.weight || 0, req.body.height || 0, req.body.width || 0, req.body.length || 0, req.body.is_featured === 'true', id]
    );
    
    // Add new product images using connection with ? placeholders
    if (req.productImages && req.productImages.length > 0) {
      // Get highest order number using connection with ? placeholders
      const [orderResult] = await connection.query( // Destructure for mysql2
        'SELECT MAX(sort_order) AS max_order FROM product_images WHERE product_id = ?', // Use sort_order
        [id]
      );
      let nextOrder = orderResult[0].max_order !== null ? orderResult[0].max_order + 1 : 0; // Handle null max_order
      
      for (let i = 0; i < req.productImages.length; i++) {
        // Insert image using connection with ? placeholders
        await connection.query(
          'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)', // Corrected column name to sort_order
          [id, req.productImages[i].url, nextOrder + i]
        );
      }
    }
    
    // Check for variants
    const includeVariants = req.body.include_variants === 'true';
    let variants = [];
    
    if (includeVariants && req.body.variants) {
      try {
        variants = JSON.parse(req.body.variants);
        console.log(`Parsed ${variants.length} variants`);
      } catch (error) {
        console.error('Error parsing variants JSON:', error);
        return res.status(400).json({ message: 'Invalid variants format' });
      }
    }
    
    // Insert or update variants using connection with ? placeholders
    if (variants.length > 0) {
      let imageIndex = 0; // Initialize index for variant images
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        // Check if variant exists using connection with ? placeholders
        const [existingResult] = await connection.query( // Destructure for mysql2
          'SELECT variant_id FROM product_variants WHERE sku = ? AND product_id = ?',
          [variant.sku, id]
        );
        let variantId;
        if (existingResult.length > 0) { // Check array length
          // Update existing variant using connection with ? placeholders
          variantId = existingResult[0].variant_id;
          await connection.query(
            `UPDATE product_variants SET
              size = ?, color = ?, price = ?, stock = ?, weight = ?, height = ?, width = ?
            WHERE variant_id = ?`,
            [variant.size || '', variant.color || '', variant.price || 0, variant.stock || 0, variant.weight || 0, variant.height || 0, variant.width || 0, variantId]
          );
        } else {
          // Insert new variant using connection with ? placeholders
          const [variantInsertResult] = await connection.query( // Destructure for mysql2
            `INSERT INTO product_variants (
              product_id, size, color, price, stock, sku, weight, height, width
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [id, variant.size || '', variant.color || '', variant.price || 0, variant.stock || 0, variant.sku, variant.weight || 0, variant.height || 0, variant.width || 0]
          );
          variantId = variantInsertResult.insertId; // Get insertId
        }
        
        // Update variant image URL using connection with ? placeholders, using imageIndex
        if (variant.has_image && req.variantImages && imageIndex < req.variantImages.length) {
          const variantImage = req.variantImages[imageIndex]; // Get image based on imageIndex
          await connection.query(
            'UPDATE product_variants SET image_url = ? WHERE variant_id = ?',
            [variantImage.url, variantId]
          );
          imageIndex++; // Increment index only when an image is used
        }
      }
    }
    
    // Commit transaction using connection
    await connection.query('COMMIT');
    
    // Return success
    res.status(200).json({ 
      message: 'Product updated successfully',
      product: { 
        product_id: id,
        variants_count: variants.length
      }
    });
    
  } catch (error) {
    // Rollback using connection
    await connection.query('ROLLBACK');
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product: ' + error.message });
  } finally {
    // Release the connection
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

        // 1. Find the image record to get the URL using ?
        const [images] = await connection.query('SELECT image_url FROM product_images WHERE image_id = ?', [imageId]); // Use image_url
        if (images.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Image not found' });
        }
        const imageUrl = images[0].image_url;

        // 2. Delete the image record from the database using ?
        const [result] = await connection.query('DELETE FROM product_images WHERE image_id = ?', [imageId]);

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