const { body, validationResult } = require('express-validator');
const db = require('../config/db');

// Handler for GET /api/cart
async function getCart(req, res) {
  try {
    const userId = req.user?.user?.id || req.user?.id || req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: 'User authentication failed' });
    }
    console.log('Fetching cart for user ID:', userId);
    const [cartItems] = await db.query(`
      SELECT c.cart_id, c.user_id, c.product_id, c.variant_id, c.quantity, c.created_at, c.updated_at,
             p.name AS product_name, p.product_code, p.description,
             COALESCE(
               (SELECT price FROM product_variants WHERE variant_id = c.variant_id),
               (SELECT MIN(price) FROM product_variants WHERE product_id = p.product_id),
               p.price,
               0
             ) AS price,
             COALESCE(
               (SELECT stock FROM product_variants WHERE variant_id = c.variant_id),
               (SELECT SUM(stock) FROM product_variants WHERE product_id = p.product_id),
               p.stock,
               0
             ) AS stock,
             COALESCE(
               (SELECT image_url FROM product_variants WHERE variant_id = c.variant_id),
               (SELECT image_url FROM product_variants WHERE product_id = p.product_id LIMIT 1),
               (SELECT image_url FROM product_images WHERE product_id = p.product_id ORDER BY sort_order LIMIT 1)
             ) AS image_url,
             COALESCE(
               (SELECT JSON_UNQUOTE(JSON_EXTRACT(attributes, '$.Size')) FROM product_variants WHERE variant_id = c.variant_id),
               NULL
             ) AS size,
             COALESCE(
               (SELECT JSON_UNQUOTE(JSON_EXTRACT(attributes, '$.Color')) FROM product_variants WHERE variant_id = c.variant_id),
               NULL
             ) AS color,
             (SELECT sku FROM product_variants WHERE variant_id = c.variant_id) AS sku
      FROM cart c
      JOIN products p ON c.product_id = p.product_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `, [userId]);
    console.log(`Found ${cartItems.length} cart items for user ${userId}`);
    const processedCartItems = cartItems.map(item => {
      let processedImageUrl = null;
      if (item.image_url) {
        if (Buffer.isBuffer(item.image_url)) {
          processedImageUrl = `data:image/jpeg;base64,${item.image_url.toString('base64')}`;
        } else if (typeof item.image_url === 'string') {
          processedImageUrl = item.image_url.startsWith('/') ? item.image_url : `/uploads/${item.image_url}`;
        }
      }
      return {
        ...item,
        price: Number(item.price) || 0,
        stock: Number(item.stock) || 0,
        image_url: processedImageUrl || '/placeholder-product.jpg'
      };
    });
    res.json(processedCartItems);
  } catch (err) {
    console.error('Cart fetch error:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// Handler for POST /api/cart
async function addToCart(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const userId = req.user?.user?.id || req.user?.id || req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: 'User authentication failed' });
    }
    const { product_id, quantity, variant_id } = req.body;
    console.log('Adding to cart:', { userId, product_id, variant_id, quantity });
    const [products] = await db.query('SELECT * FROM products WHERE product_id = ?', [product_id]);
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const [allVariants] = await db.query('SELECT * FROM product_variants WHERE product_id = ?', [product_id]);
    console.log(`Product ${product_id} has ${allVariants.length} variants`);
    if (variant_id) {
      const [variant] = await db.query('SELECT * FROM product_variants WHERE variant_id = ? AND product_id = ?', [variant_id, product_id]);
      if (variant.length === 0) {
        return res.status(404).json({ message: 'Variant not found for this product' });
      }
      console.log(`Variant ${variant_id} has stock: ${variant[0].stock}, requested quantity: ${quantity}`);
      if (variant[0].stock < quantity) {
        return res.status(400).json({ message: 'Not enough stock available for the selected variant' });
      }
    } else if (allVariants.length > 0) {
      const [variants] = await db.query('SELECT SUM(stock) AS total_stock FROM product_variants WHERE product_id = ?', [product_id]);
      console.log(`Total stock for product ${product_id}: ${variants[0]?.total_stock}, requested quantity: ${quantity}`);
      if (!variants[0]?.total_stock || variants[0].total_stock < quantity) {
        return res.status(400).json({ 
          message: 'Not enough stock available',
          debug: `Available stock: ${variants[0]?.total_stock || 0}, requested: ${quantity}`
        });
      }
    } else {
      const productStock = products[0].stock || null;
      console.log(`Product ${product_id} has no variants. Product stock: ${productStock}, requested quantity: ${quantity}`);
      if (productStock !== null && productStock < quantity) {
        return res.status(400).json({ 
          message: 'Not enough stock available',
          debug: `Product stock: ${productStock}, requested: ${quantity}. Note: Product has no variants configured.`
        });
      }
      if (productStock === null) {
        console.log(`Product ${product_id} has no stock tracking. Allowing cart addition.`);
      }
    }
    let existingQuery = 'SELECT * FROM cart WHERE user_id = ? AND product_id = ?';
    let queryParams = [userId, product_id];
    if (variant_id) {
      existingQuery += ' AND variant_id = ?';
      queryParams.push(variant_id);
    } else {
      existingQuery += ' AND variant_id IS NULL';
    }
    const [existingItems] = await db.query(existingQuery, queryParams);
    if (existingItems.length > 0) {
      const newQuantity = existingItems[0].quantity + quantity;
      if (variant_id) {
        const [variant] = await db.query('SELECT stock FROM product_variants WHERE variant_id = ?', [variant_id]);
        if (newQuantity > variant[0].stock) {
          return res.status(400).json({ message: 'Not enough stock available for the requested quantity' });
        }
      } else if (allVariants.length > 0) {
        const [variants] = await db.query('SELECT SUM(stock) AS total_stock FROM product_variants WHERE product_id = ?', [product_id]);
        if (newQuantity > variants[0].total_stock) {
          return res.status(400).json({ message: 'Not enough stock available for the requested quantity' });
        }
      } else {
        const productStock = products[0].stock || null;
        if (productStock !== null && newQuantity > productStock) {
          return res.status(400).json({ message: 'Not enough stock available for the requested quantity' });
        }
      }
      await db.query(
        'UPDATE cart SET quantity = ?, updated_at = NOW() WHERE cart_id = ?',
        [newQuantity, existingItems[0].cart_id]
      );
      console.log('Cart item updated successfully');
      return res.json({
        message: 'Cart updated successfully',
        item: {
          cart_id: existingItems[0].cart_id,
          product_id,
          variant_id: variant_id || null,
          quantity: newQuantity
        }
      });
    }
    const insertQuery = variant_id
      ? 'INSERT INTO cart (user_id, product_id, variant_id, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())'
      : 'INSERT INTO cart (user_id, product_id, quantity, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())';
    const insertParams = variant_id
      ? [userId, product_id, variant_id, quantity]
      : [userId, product_id, quantity];
    const [result] = await db.query(insertQuery, insertParams);
    console.log('Cart item added successfully');
    res.status(201).json({
      message: 'Item added to cart',
      item: {
        cart_id: result.insertId,
        user_id: userId,
        product_id,
        variant_id: variant_id || null,
        quantity
      }
    });
  } catch (err) {
    console.error('Cart add error:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// Handler for PUT /api/cart/:id
async function updateCartItem(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const cartId = req.params.id;
    const userId = req.user?.user?.id || req.user?.id || req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: 'User authentication failed' });
    }
    const { quantity } = req.body;
    console.log('Updating cart item:', { cartId, userId, quantity });
    const [cartItems] = await db.query(
      'SELECT c.*, (SELECT SUM(stock) FROM product_variants WHERE product_id = c.product_id) AS available_stock FROM cart c WHERE c.cart_id = ? AND c.user_id = ?',
      [cartId, userId]
    );
    if (cartItems.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }
    if (quantity > cartItems[0].available_stock) {
      return res.status(400).json({ message: 'Not enough stock available' });
    }
    await db.query(
      'UPDATE cart SET quantity = ?, updated_at = NOW() WHERE cart_id = ?',
      [quantity, cartId]
    );
    console.log('Cart item quantity updated successfully');
    res.json({
      message: 'Cart updated successfully',
      item: {
        cart_id: cartId,
        quantity
      }
    });
  } catch (err) {
    console.error('Cart update error:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// Handler for DELETE /api/cart/:id
async function deleteCartItem(req, res) {
  try {
    const cartId = req.params.id;
    const userId = req.user?.user?.id || req.user?.id || req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: 'User authentication failed' });
    }
    console.log('Deleting cart item:', { cartId, userId });
    const [result] = await db.query(
      'DELETE FROM cart WHERE cart_id = ? AND user_id = ?',
      [cartId, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }
    console.log('Cart item deleted successfully');
    res.json({ message: 'Item removed from cart' });
  } catch (err) {
    console.error('Cart delete error:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// Handler for DELETE /api/cart
async function clearCart(req, res) {
  try {
    const userId = req.user?.user?.id || req.user?.id || req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: 'User authentication failed' });
    }
    console.log('Clearing cart for user:', userId);
    await db.query('DELETE FROM cart WHERE user_id = ?', [userId]);
    console.log('Cart cleared successfully');
    res.json({ message: 'Cart cleared successfully' });
  } catch (err) {
    console.error('Cart clear error:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  deleteCartItem,
  clearCart
};
