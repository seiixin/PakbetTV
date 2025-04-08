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
    const { name, description, price, image_url, category, stock } = req.body;
    
    // Check if all required fields are provided
    if (!name || !price || !category) {
      return res.status(400).json({ message: 'Name, price, and category are required' });
    }
    
    // Validate category
    const validCategories = ['books', 'amulets', 'bracelets', 'plants', 'decor', 'mirrors', 'figurines'];
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
    
    // Insert the product into the database
    const [result] = await db.query(
      'INSERT INTO products (product_code, name, description, price, image_url, category, stock) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [productCode, name, description, price, productImage, category, stock || 0]
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
    const { name, description, price, category, stock } = req.body;
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
      stock: stock || current.stock
    };
    
    // Validate category if being updated
    if (category && category !== current.category) {
      const validCategories = ['books', 'amulets', 'bracelets', 'plants', 'decor', 'mirrors', 'figurines'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ 
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
        });
      }
    }
    
    // Update the product
    const [result] = await db.query(
      'UPDATE products SET name = ?, description = ?, price = ?, image_url = ?, category = ?, stock = ? WHERE id = ?',
      [updatedValues.name, updatedValues.description, updatedValues.price, updatedValues.image_url, updatedValues.category, updatedValues.stock, productId]
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