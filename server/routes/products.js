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
const fileFilter = (req, file, cb) => {
  if(file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed!'), false);
  }
};
const uploadProductImages = multer({ 
  storage: productStorage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } 
});
const uploadVariantImages = multer({ 
  storage: variantStorage, 
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } 
});
const upload = multer({
  storage: multer.diskStorage({
    destination: async function(req, file, cb) {
      try {
        let uploadDir;
        if (file.fieldname === 'productImages') {
          uploadDir = path.join(__dirname, '../uploads/products');
        } else if (file.fieldname === 'variantImages') {
          uploadDir = path.join(__dirname, '../uploads/variants');
        } else {
          uploadDir = path.join(__dirname, '../uploads');
        }
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
  limits: { fileSize: 5 * 1024 * 1024 } 
}).fields([
  { name: 'productImages', maxCount: 10 },
  { name: 'variantImages', maxCount: 20 }
]);
const handleCombinedUpload = async (req, res, next) => {
  console.log('Starting file upload processing...');
  upload(req, res, async function (err) {
    if (err) {
      console.error('Multer upload error:', err);
      return res.status(400).json({ message: 'File upload error: ' + err.message });
    }
    try {
      console.log('Files received:', req.files ? Object.keys(req.files) : 'None');
      if (req.files && req.files.productImages) {
        console.log(`Processing ${req.files.productImages.length} product images`);
        req.productImages = req.files.productImages.map(file => {
          const relativePath = 'uploads/' + path.basename(file.path);
          return {
            filename: file.filename,
            path: file.path,
            url: relativePath
          };
        });
      } else {
        req.productImages = [];
      }
      if (req.files && req.files.variantImages) {
        console.log(`Processing ${req.files.variantImages.length} variant images`);
        req.variantImages = req.files.variantImages.map(file => {
          const relativePath = 'uploads/' + path.basename(file.path);
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
router.post('/', handleCombinedUpload, [
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
], async (req, res) => {
  const connection = await db.getConnection();
  try {
    console.log('Creating new product...');
    console.log('Request body:', req.body);
    console.log('Product images:', req.productImages?.length || 0);
    console.log('Variant images:', req.variantImages?.length || 0);
    const { name, price, category_id, description } = req.body;
    if (!name || !category_id) {
      return res.status(400).json({ message: 'Product name and category ID are required' });
    }
    await connection.query('BEGIN');
    let productCode = req.body.product_code;
    if (!productCode) {
      const seqResult = await connection.query(
        `SELECT MAX(CAST(SUBSTRING(product_code FROM LOCATE('-', product_code) + 1) AS INTEGER)) AS max_seq 
         FROM products WHERE category_id = ?`,
        [category_id]
      );
      const maxSeq = seqResult[0][0].max_seq || 0; 
      const newSeq = maxSeq + 1;
      const catResult = await connection.query(
        'SELECT name FROM categories WHERE category_id = ?',
        [category_id]
      );
      if (catResult[0].length === 0) { 
        throw new Error('Invalid category ID');
      }
      const categoryName = catResult[0][0].name;
      const categoryCode = categoryName.substring(0, 3).toUpperCase();
      productCode = `${categoryCode}-${String(newSeq).padStart(3, '0')}`; 
      console.log(`Generated product code: ${productCode}`);
    }
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
    const [productInsertResult] = await connection.query( 
      `INSERT INTO products (
        product_code, name, description, category_id
      ) VALUES (?, ?, ?, ?)`, 
      [productCode, name, description || '', category_id]
    );
    const productId = productInsertResult.insertId; 
    console.log(`Product created with ID: ${productId}`);
    if (req.productImages && req.productImages.length > 0) {
      for (let i = 0; i < req.productImages.length; i++) {
        await connection.query(
          'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)', 
          [productId, req.productImages[i].url, i]
        );
      }
    }
    if (variants.length > 0) {
      let imageIndex = 0; 
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const [variantInsertResult] = await connection.query(
          `INSERT INTO product_variants (
            product_id, price, stock, sku, attributes, image_url
          ) VALUES (?, ?, ?, ?, ?, ?)`, 
          [
            productId, 
            variant.price || 0, 
            variant.stock || 0, 
            variant.sku, 
            JSON.stringify(variant.attributes || {}), 
            null 
          ]
        );
        const variantId = variantInsertResult.insertId;
        console.log(`Created variant with ID: ${variantId}, Attributes:`, variant.attributes);
        if (variant.has_image && req.variantImages && imageIndex < req.variantImages.length) {
          const variantImage = req.variantImages[imageIndex]; 
          await connection.query(
            'UPDATE product_variants SET image_url = ? WHERE variant_id = ?',
            [variantImage.url, variantId]
          );
          imageIndex++; 
        }
      }
    }
    await connection.query('COMMIT');
    res.status(201).json({ 
      message: 'Product created successfully',
      product: { 
        product_id: productId,
        product_code: productCode,
        variants_count: variants.length
      }
    });
  } catch (error) {
    await connection.query('ROLLBACK');
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Error creating product: ' + error.message });
  } finally {
    connection.release();
  }
});
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const offset = (page - 1) * limit;
    const category = req.query.category;

    console.log('Fetching products with params:', { page, limit, offset, category });

    let productQuery = `
      SELECT 
        p.product_id, 
        p.name, 
        p.product_code, 
        p.description, 
        p.category_id, 
        p.created_at, 
        p.updated_at,
        c.name AS category_name,
        p.price as base_price,
        p.average_rating,
        p.review_count,
        COALESCE(SUM(pv.stock), 0) as stock,
        GROUP_CONCAT(DISTINCT pv.image_url) as variant_images
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN product_variants pv ON p.product_id = pv.product_id
    `;

    let countQuery = 'SELECT COUNT(DISTINCT p.product_id) AS total FROM products p';
    const queryParams = [];
    let countQueryParams = [];

    if (category) {
      const whereClause = ' WHERE p.category_id = ?';
      productQuery += whereClause;
      countQuery += whereClause;
      queryParams.push(category);
      countQueryParams.push(category);
    }

    productQuery += ' GROUP BY p.product_id, p.name, p.product_code, p.description, p.category_id, p.created_at, p.updated_at, c.name, p.price';
    productQuery += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    console.log('Executing product query:', productQuery);
    console.log('Query params:', queryParams);

    try {
      const [products] = await db.query(productQuery, queryParams);
      console.log(`Successfully fetched ${products.length} products`);
      
      const [countResult] = await db.query(countQuery, countQueryParams);
      const totalProducts = countResult[0].total;
      const totalPages = Math.ceil(totalProducts / limit);

      console.log(`Found ${products.length} products out of ${totalProducts} total`);

      // For each product, get the primary image from product_images table
      for (const product of products) {
        // Get variants for each product to display the correct price range
        const [productVariants] = await db.query(
          'SELECT variant_id, sku, price, stock, image_url, attributes FROM product_variants WHERE product_id = ?',
          [product.product_id]
        );
        
        // Process variants and set price correctly
        if (productVariants && productVariants.length > 0) {
          product.variants = productVariants.map(variant => ({
            ...variant,
            price: Number(variant.price) || 0,
            stock: Number(variant.stock) || 0,
            attributes: variant.attributes ? JSON.parse(variant.attributes) : {}
          }));

          // Calculate price from variants if available
          const validPrices = productVariants
            .map(v => Number(v.price))
            .filter(p => !isNaN(p) && p > 0);
            
          if (validPrices.length > 0) {
            product.price = Math.min(...validPrices);
          } else {
            product.price = Number(product.base_price) || 0;
          }
        } else {
          product.price = Number(product.base_price) || 0;
          product.variants = [];
        }
        
        delete product.base_price;

        // Ensure rating data is properly formatted
        product.average_rating = product.average_rating !== null ? Number(product.average_rating) : 0;
        product.review_count = Number(product.review_count) || 0;

        // First check if we have product_images records
        const [productImages] = await db.query(
          'SELECT image_id, image_url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order LIMIT 1', 
          [product.product_id]
        );
        
        if (productImages.length > 0) {
          const image = productImages[0];
          // Check if image_url is a Buffer (BLOB)
          if (image.image_url && Buffer.isBuffer(image.image_url)) {
            product.images = [{
              id: image.image_id,
              url: `data:image/jpeg;base64,${image.image_url.toString('base64')}`,
              alt: image.alt_text || product.name,
              order: image.sort_order
            }];
          } else {
            product.images = [{
              id: image.image_id,
              url: `/uploads/${image.image_url}`,
              alt: image.alt_text || product.name,
              order: image.sort_order
            }];
          }
        } 
        // If no product_images, use variant images
        else if (product.variant_images) {
          const imageUrls = product.variant_images.split(',').filter(url => url);
          console.log(`Processing variant images for product ${product.product_id}:`, imageUrls);
          
          // For variant images, we're assuming they're not BLOB data but file paths
          product.images = imageUrls.map((url, index) => {
            let imageUrl = url.trim();
            // Check if it's already a path
            if (!imageUrl.startsWith('/')) {
              imageUrl = `/uploads/${path.basename(imageUrl)}`;
            }
            console.log(`Formatted image URL: ${imageUrl}`);
            return {
              url: imageUrl,
              alt: `${product.name} - Variant ${index + 1}`,
              order: index
            };
          });
        } else {
          product.images = [];
        }

        // Ensure price and stock are numbers
        product.stock = Number(product.stock) || 0;
        delete product.variant_images; // Remove the raw variant_images field
      }

      res.json({
        products: products,
        pagination: {
          currentPage: page,
          totalPages,
          totalProducts,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (queryError) {
      console.error('Error executing product query:', queryError);
      throw new Error('Query execution failed: ' + queryError.message);
    }
  } catch (err) {
    console.error("Error in products route:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    
    res.status(500).json({ 
      message: 'Server error while fetching products',
      error: process.env.NODE_ENV === 'development' ? {
        message: err.message,
        code: err.code,
        stack: err.stack
      } : undefined
    });
  }
});
router.get('/search', async (req, res) => {
  try {
    const searchQuery = req.query.query;
    console.log('\n=== Product Search Debug ===');
    console.log('Search query received:', searchQuery);
    
    if (!searchQuery) {
      return res.json([]);
    }

    const searchTerm = `%${searchQuery.toLowerCase()}%`;
    
    // Enhanced query to include images and ensure category info
    const sqlQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        c.category_id,
        COALESCE(MIN(pv.price), p.price) as min_price,
        COALESCE(MAX(pv.price), p.price) as max_price,
        (
          SELECT pi.image_url 
          FROM product_images pi 
          WHERE pi.product_id = p.product_id 
          ORDER BY pi.sort_order 
          LIMIT 1
        ) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN product_variants pv ON p.product_id = pv.product_id
      WHERE 
        LOWER(p.name) LIKE ? OR
        LOWER(COALESCE(p.description, '')) LIKE ? OR
        LOWER(COALESCE(p.product_code, '')) LIKE ? OR
        LOWER(COALESCE(c.name, '')) LIKE ?
      GROUP BY p.product_id
      ORDER BY 
        CASE 
          WHEN LOWER(p.name) LIKE ? THEN 10
          WHEN LOWER(p.description) LIKE ? THEN 5
          ELSE 1
        END DESC,
        p.created_at DESC
      LIMIT 10
    `;

    const params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
    console.log('\nExecuting search with params:', params);

    const [results] = await db.query(sqlQuery, params);
    console.log(`\nFound ${results.length} results`);

    // Process the results with better error handling
    const products = await Promise.all(results.map(async (product) => {
      try {
        // Get the primary image if not already included
        let imageUrl = product.primary_image;
        if (!imageUrl) {
          const [images] = await db.query(
            'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order LIMIT 1',
            [product.product_id]
          );
          if (images.length > 0) {
            imageUrl = images[0].image_url;
          }
        }

        // Handle price range
        const minPrice = Number(product.min_price) || Number(product.price) || 0;
        const maxPrice = Number(product.max_price) || Number(product.price) || 0;
        const price = minPrice === maxPrice ? minPrice : { min: minPrice, max: maxPrice };

        return {
          product_id: product.product_id,
          name: product.name,
          description: product.description,
          product_code: product.product_code || '',
          category_name: product.category_name || 'Uncategorized',
          category_id: product.category_id,
          price: price,
          average_rating: product.average_rating !== null ? Number(product.average_rating) : 0,
          review_count: Number(product.review_count) || 0,
          image: imageUrl ? `/uploads/${imageUrl}` : null,
          stock: Number(product.stock) || 0
        };
      } catch (err) {
        console.error(`Error processing product ${product.product_id}:`, err);
        return null;
      }
    }));

    // Filter out any null products from errors
    const validProducts = products.filter(p => p !== null);
    console.log('\nProcessed products to return:', validProducts);
    console.log('=== End Debug ===\n');

    res.json(validProducts);
  } catch (err) {
    console.error('Error in product search:', err);
    res.status(500).json({ 
      error: 'Server error during product search',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const [productResult] = await db.query(`
      SELECT 
        p.product_id, p.name, p.product_code, p.description, p.category_id, 
        p.price, p.stock AS stock_quantity, p.created_at, p.updated_at,
        COALESCE(SUM(oi.quantity), 0) as items_sold,
        p.average_rating, p.review_count, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN order_items oi ON p.product_id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.order_id AND o.order_status IN ('completed', 'delivered')
      WHERE p.product_id = ?
      GROUP BY p.product_id, p.name, p.product_code, p.description, p.category_id, 
               p.price, p.stock, p.created_at, p.updated_at, p.average_rating, 
               p.review_count, c.name
    `, [productId]);
    if (productResult.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const product = {
      ...productResult[0],
      average_rating: productResult[0].average_rating !== null ? Number(productResult[0].average_rating) : null,
      review_count: Number(productResult[0].review_count) || 0
    };
    
    // Get variants including image data
    const [variants] = await db.query('SELECT variant_id, product_id, sku, price, stock, image_url, attributes, created_at, updated_at FROM product_variants WHERE product_id = ?', [productId]);
    const variantsWithDetails = [];
    for (const variant of variants) {
      let parsedAttributes = {};
      try {
        parsedAttributes = typeof variant.attributes === 'string' ? JSON.parse(variant.attributes) : variant.attributes; 
      } catch (e) {
        console.error(`Error parsing attributes for variant ${variant.variant_id}:`, e);
      }
      const attributeString = Object.entries(parsedAttributes || {}).map(([key, value]) => value).join(' ');
      const variantName = attributeString ? `${product.name} - ${attributeString}` : product.name;
      let variantImage = null;
      
      if (variant.image_url) {
        variantImage = {
          id: `variant-img-${variant.variant_id}`,
          url: variant.image_url,
          alt: `${product.name} - ${attributeString}`,
          order: 0
        };
      }
      
      variantsWithDetails.push({
        ...variant, 
        attributes: parsedAttributes, 
        parent_product_id: productId,
        images: variantImage ? [variantImage] : [],
        name: variantName
      });
    }
    
    // Get product images as BLOB data
    const [images] = await db.query(
        'SELECT image_id, image_url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order', 
        [productId]
    );
    
    // Process image data
    const processedImages = images.map(img => {
      // If image_url is a BLOB, convert to base64
      if (img.image_url && Buffer.isBuffer(img.image_url)) {
        return {
          id: img.image_id,
          url: `data:image/jpeg;base64,${img.image_url.toString('base64')}`,
          alt: img.alt_text || product.name,
          order: img.sort_order
        };
      } else {
        // Otherwise use as URL path
        return {
          id: img.image_id,
          url: `/uploads/${img.image_url}`,
          alt: img.alt_text || product.name,
          order: img.sort_order
        };
      }
    });
    
    res.json({
      ...product,
      variants: variantsWithDetails,
      images: processedImages
    });
  } catch (err) {
    console.error("Error fetching product details:", err);
    res.status(500).json({ message: 'Server error while fetching product details' });
  }
});
router.put('/:id', handleCombinedUpload, async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();
  try {
    console.log(`Updating product ${id}...`);
    console.log('Request body:', req.body);
    console.log('Product images:', req.productImages?.length || 0);
    console.log('Variant images:', req.variantImages?.length || 0);
    const { name, category_id } = req.body;
    if (!name || !category_id) {
      return res.status(400).json({ message: 'Product name and category ID are required' });
    }
    await connection.query('BEGIN');
    await connection.query(
      `UPDATE products SET
        name = ?, description = ?, price = ?, stock = ?, category_id = ?,
        is_featured = ?,
        updated_at = NOW()
      WHERE product_id = ?`,
      [
        name, 
        req.body.description || '', 
        req.body.price || 0, 
        req.body.stock || 0, 
        category_id, 
        req.body.is_featured === 'true', 
        id
      ]
    );
    if (req.productImages && req.productImages.length > 0) {
      const [orderResult] = await connection.query( 
        'SELECT MAX(sort_order) AS max_order FROM product_images WHERE product_id = ?', 
        [id]
      );
      let nextOrder = orderResult[0].max_order !== null ? orderResult[0].max_order + 1 : 0; 
      for (let i = 0; i < req.productImages.length; i++) {
        await connection.query(
          'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)', 
          [id, req.productImages[i].url, nextOrder + i]
        );
      }
    }
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
    if (variants.length > 0) {
      let imageIndex = 0; 
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const [existingResult] = await connection.query( 
          'SELECT variant_id FROM product_variants WHERE sku = ? AND product_id = ?',
          [variant.sku, id]
        );
        let variantId;
        if (existingResult.length > 0) {
          variantId = existingResult[0].variant_id;
          await connection.query(
            `UPDATE product_variants SET
              price = ?, stock = ?, attributes = ?
            WHERE variant_id = ?`,
            [
              variant.price || 0, 
              variant.stock || 0, 
              JSON.stringify(variant.attributes || {}), 
              variantId
            ]
          );
          console.log(`Updated variant with ID: ${variantId}, Attributes:`, variant.attributes);
        } else {
          const [variantInsertResult] = await connection.query(
            `INSERT INTO product_variants (
              product_id, price, stock, sku, attributes, image_url
            ) VALUES (?, ?, ?, ?, ?, ?)`, 
            [
              id, 
              variant.price || 0, 
              variant.stock || 0, 
              variant.sku, 
              JSON.stringify(variant.attributes || {}), 
              null 
            ]
          );
          variantId = variantInsertResult.insertId;
          console.log(`Created variant with ID: ${variantId}, Attributes:`, variant.attributes);
        }
        if (variant.has_image && req.variantImages && imageIndex < req.variantImages.length) {
          const variantImage = req.variantImages[imageIndex]; 
          await connection.query(
            'UPDATE product_variants SET image_url = ? WHERE variant_id = ?',
            [variantImage.url, variantId]
          );
          imageIndex++; 
        }
      }
    }
    await connection.query('COMMIT');
    res.status(200).json({ 
      message: 'Product updated successfully',
      product: { 
        product_id: id,
        variants_count: variants.length
      }
    });
  } catch (error) {
    await connection.query('ROLLBACK');
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product: ' + error.message });
  } finally {
    connection.release();
  }
});
router.delete('/:id', async (req, res) => {
 const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const productId = req.params.id;
    const [variants] = await connection.query('SELECT image_url FROM product_variants WHERE product_id = ?', [productId]);
    const [productImages] = await connection.query('SELECT image_url FROM product_images WHERE product_id = ?', [productId]);
    const [result] = await connection.query('DELETE FROM products WHERE product_id = ?', [productId]);
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }
    await connection.commit();
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
router.delete('/images/:imageId', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const imageId = req.params.imageId;
        const [images] = await connection.query('SELECT image_url FROM product_images WHERE image_id = ?', [imageId]); 
        if (images.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Image not found' });
        }
        const imageUrl = images[0].image_url;
        const [result] = await connection.query('DELETE FROM product_images WHERE image_id = ?', [imageId]);
        await connection.commit();
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