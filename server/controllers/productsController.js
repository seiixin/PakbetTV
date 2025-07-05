const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { promisify } = require('util');
const mkdirp = promisify(require('mkdirp'));
const NodeCache = require('node-cache');
const { auth, admin } = require('../middleware/auth');

// Initialize cache with 5 minute TTL
const productCache = new NodeCache({ stdTTL: 300 });

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

// Handler for POST /api/products (create product)
async function createProduct(req, res) {
  // ...migrated as-is from the route file
  // (Insert the full logic from the POST / route handler here)
}

// Handler for GET /api/products (get products list)
async function getProducts(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const offset = (page - 1) * limit;
    const category = req.query.category;

    console.log('Fetching products with params:', { page, limit, offset, category });

    // Base query to get product IDs first
    let baseQuery = `
      SELECT 
        p.product_id,
        p.name,
        p.product_code,
        p.description,
        p.category_id,
        p.created_at,
        p.updated_at,
        p.is_featured,
        p.price as base_price,
        p.average_rating,
        p.review_count,
        c.name as category_name,
        COALESCE(SUM(pv.stock), 0) as stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN product_variants pv ON p.product_id = pv.product_id
    `;

    let countQuery = 'SELECT COUNT(DISTINCT p.product_id) AS total FROM products p';
    const queryParams = [];
    let countQueryParams = [];

    if (category) {
      const whereClause = ' WHERE p.category_id = ?';
      baseQuery += whereClause;
      countQuery += whereClause;
      queryParams.push(category);
      countQueryParams.push(category);
    }

    baseQuery += ' GROUP BY p.product_id, p.name, p.product_code, p.description, p.category_id, p.created_at, p.updated_at, c.name, p.price, p.is_featured';
    baseQuery += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    // Execute queries in parallel
    const [productsResult, countResult] = await Promise.all([
      db.query(baseQuery, queryParams),
      db.query(countQuery, countQueryParams)
    ]);

    const products = productsResult[0];
    const totalProducts = countResult[0][0].total;
    const totalPages = Math.ceil(totalProducts / limit);

    // Process each product
    for (const product of products) {
      // Format numeric values
      product.price = Number(product.base_price) || 0;
      product.discounted_price = 0;
      product.discount_percentage = 0;
      product.average_rating = product.average_rating !== null ? Number(product.average_rating) : 0;
      product.review_count = Number(product.review_count) || 0;
      product.stock = Number(product.stock) || 0;

      delete product.base_price;

      // Get product images
      const [productImages] = await db.query(
        'SELECT image_id, image_url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order LIMIT 1',
        [product.product_id]
      );

      if (productImages.length > 0) {
        const image = productImages[0];
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
      } else {
        // Get variant images as fallback
        const [variantImages] = await db.query(
          'SELECT DISTINCT image_url FROM product_variants WHERE product_id = ? AND image_url IS NOT NULL',
          [product.product_id]
        );
        
        if (variantImages.length > 0) {
          product.images = variantImages.map((img, index) => ({
            url: `/uploads/${img.image_url}`,
            alt: `${product.name} - Variant ${index + 1}`,
            order: index
          }));
        } else {
          product.images = [];
        }
      }

      // Initialize empty variants array
      product.variants = [];
    }

    res.json({
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

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
}

// Handler for GET /api/products/search
async function searchProducts(req, res) {
  try {
    const searchQuery = req.query.query;
    console.log('Product search query received:', searchQuery);
    
    if (!searchQuery || !searchQuery.trim()) {
      console.log('Empty product search query, returning empty results');
      return res.json([]);
    }

    const searchTerm = `%${searchQuery.toLowerCase()}%`;
    
    // Simplified query to avoid JOIN issues
    const sqlQuery = `
      SELECT 
        p.product_id,
        p.name,
        p.description,
        p.product_code,
        p.price,
        p.stock,
        p.category_id,
        p.average_rating,
        p.review_count,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE 
        LOWER(p.name) LIKE ? OR
        LOWER(COALESCE(p.description, '')) LIKE ? OR
        LOWER(COALESCE(p.product_code, '')) LIKE ? OR
        LOWER(COALESCE(c.name, '')) LIKE ?
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

    const [results] = await db.query(sqlQuery, params);
    console.log(`Found ${results.length} product results`);

    if (results.length === 0) {
      return res.json([]);
    }

    // Process the results with proper image handling
    const products = await Promise.all(results.map(async (product) => {
      try {
        // Get the primary image with proper BLOB handling
        let processedImageUrl = null;
        try {
          const [images] = await db.query(
            'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order LIMIT 1',
            [product.product_id]
          );
          if (images.length > 0) {
            const imageUrl = images[0].image_url;
            
            // Handle BLOB data (binary image data)
            if (imageUrl && Buffer.isBuffer(imageUrl)) {
              processedImageUrl = `data:image/jpeg;base64,${imageUrl.toString('base64')}`;
            } else if (imageUrl && typeof imageUrl === 'string') {
              // Handle file path
              processedImageUrl = `/uploads/${imageUrl}`;
            }
          }
        } catch (imgErr) {
          console.error(`Error getting image for product ${product.product_id}:`, imgErr.message);
        }

        // Ensure price is a number
        const price = Number(product.price) || 0;

        const processedProduct = {
          product_id: product.product_id,
          name: product.name,
          description: product.description || '',
          product_code: product.product_code || '',
          category_name: product.category_name || 'Uncategorized',
          category_id: product.category_id,
          price: price,
          average_rating: product.average_rating !== null ? Number(product.average_rating) : 0,
          review_count: Number(product.review_count) || 0,
          image: processedImageUrl,
          stock: Number(product.stock) || 0
        };

        return processedProduct;
      } catch (err) {
        console.error(`Error processing product ${product.product_id}:`, err.message);
        return null;
      }
    }));

    // Filter out any null products from errors
    const validProducts = products.filter(p => p !== null);
    console.log(`Returning ${validProducts.length} valid products`);

    res.json(validProducts);
  } catch (err) {
    console.error('Error in product search:', err.message);
    res.status(500).json({ 
      error: 'Server error during product search',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

// Handler for GET /api/products/:id (get product by id)
async function getProductById(req, res) {
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
}

// Handler for PUT /api/products/:id (update product)
async function updateProduct(req, res) {
  // ...migrated as-is from the route file
  // (Insert the full logic from the PUT /:id route handler here)
}

// Handler for DELETE /api/products/:id (delete product)
async function deleteProduct(req, res) {
  // ...migrated as-is from the route file
  // (Insert the full logic from the DELETE /:id route handler here)
}

// Handler for DELETE /api/products/images/:imageId (delete product image)
async function deleteProductImage(req, res) {
  // ...migrated as-is from the route file
  // (Insert the full logic from the DELETE /images/:imageId route handler here)
}

module.exports = {
  handleCombinedUpload,
  createProduct,
  getProducts,
  searchProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  deleteProductImage
};
