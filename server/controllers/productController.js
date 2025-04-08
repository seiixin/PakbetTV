const db = require('../config/db');

exports.getAllProducts = async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products');
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const [product] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(product[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    // Extract product data from request body (already processed by file upload middleware)
    const { 
      name, description, price, image_url, category, stock,
      is_best_seller, is_flash_deal, flash_deal_end, discount_percentage 
    } = req.body;
    
    // Check if all fields are provided
    if (!name || !price || !category) {
      return res.status(400).json({ message: 'Name, price, and category are required' });
    }
    
    // Validate category
    const validCategories = ['books', 'amulets', 'bracelets'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
      });
    }
    
    // Use default image if none was uploaded
    const productImage = image_url || '/uploads/default-product.jpg';
    
    // Generate product code
    const categoryPrefix = category.substring(0, 3).toUpperCase();
    
    // Get the latest product number for this category
    const [categoryProducts] = await db.query(
      'SELECT product_code FROM products WHERE product_code LIKE ? ORDER BY product_code DESC LIMIT 1',
      [`${categoryPrefix}-%`]
    );
    
    let productNumber = 1;
    if (categoryProducts.length > 0) {
      // Extract the number from the last product code and increment
      const lastCode = categoryProducts[0].product_code;
      const lastNumber = parseInt(lastCode.split('-')[1]);
      productNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
    }
    
    // Create the new product code
    const productCode = `${categoryPrefix}-${productNumber}`;
    
    // Parse boolean fields and handle default values
    const isBestSeller = is_best_seller === 'true';
    const isFlashDeal = is_flash_deal === 'true';
    const discountPercentageValue = parseInt(discount_percentage) || 0;
    
    // Insert the product into the database
    const [result] = await db.query(
      `INSERT INTO products 
       (product_code, name, description, price, image_url, category, stock, 
        is_best_seller, is_flash_deal, flash_deal_end, discount_percentage) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productCode, name, description, price, productImage, category, stock || 0,
        isBestSeller, isFlashDeal, flash_deal_end || null, discountPercentageValue
      ]
    );
    
    const [newProduct] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    
    res.status(201).json(newProduct[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { 
      name, description, price, category, stock,
      is_best_seller, is_flash_deal, flash_deal_end, discount_percentage
    } = req.body;
    const productId = req.params.id;
    
    // Check if product exists
    const [existingProduct] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
    
    if (existingProduct.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Use existing values if not provided in the request
    const current = existingProduct[0];
    const updatedValues = {
      name: name || current.name,
      description: description || current.description,
      price: price || current.price,
      image_url: req.body.image_url || current.image_url,
      category: category || current.category,
      stock: stock || current.stock,
      is_best_seller: is_best_seller === 'true' || (is_best_seller !== 'false' && current.is_best_seller),
      is_flash_deal: is_flash_deal === 'true' || (is_flash_deal !== 'false' && current.is_flash_deal),
      flash_deal_end: flash_deal_end || current.flash_deal_end,
      discount_percentage: discount_percentage !== undefined ? parseInt(discount_percentage) : current.discount_percentage
    };
    
    // Validate category if being updated
    if (category && category !== current.category) {
      const validCategories = ['books', 'amulets', 'bracelets'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ 
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
        });
      }
    }
    
    // Update the product
    const [result] = await db.query(
      `UPDATE products 
       SET name = ?, description = ?, price = ?, image_url = ?, category = ?, 
           stock = ?, is_best_seller = ?, is_flash_deal = ?, flash_deal_end = ?, 
           discount_percentage = ? 
       WHERE id = ?`,
      [
        updatedValues.name, updatedValues.description, updatedValues.price, 
        updatedValues.image_url, updatedValues.category, updatedValues.stock,
        updatedValues.is_best_seller, updatedValues.is_flash_deal, 
        updatedValues.flash_deal_end, updatedValues.discount_percentage,
        productId
      ]
    );
    
    const [updatedProduct] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
    
    res.status(200).json(updatedProduct[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products WHERE category = ?', [req.params.category]);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// New endpoints for featured products

exports.getBestSellers = async (req, res) => {
  try {
    const [products] = await db.query(
      'SELECT * FROM products WHERE is_best_seller = TRUE ORDER BY id DESC'
    );
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFlashDeals = async (req, res) => {
  try {
    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const [products] = await db.query(
      `SELECT * FROM products 
       WHERE is_flash_deal = TRUE 
       AND (flash_deal_end IS NULL OR flash_deal_end > ?) 
       ORDER BY flash_deal_end ASC`,
      [currentDate]
    );
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getNewArrivals = async (req, res) => {
  try {
    // Get products added in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateString = thirtyDaysAgo.toISOString().slice(0, 19).replace('T', ' ');
    
    const [products] = await db.query(
      'SELECT * FROM products WHERE created_at > ? ORDER BY created_at DESC LIMIT 10',
      [dateString]
    );
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 