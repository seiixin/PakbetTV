const mysql = require('mysql2/promise');

async function setupPromotions() {
  let connection;
  try {
    // Create connection using the same config as your app
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'u561778649_pakbettv'
    });

    console.log('Connected to database...');

    // Create promotions table
    console.log('Creating promotions table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS promotions (
        promotion_id INT(11) UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        promotion_code VARCHAR(50) UNIQUE,
        promotion_name VARCHAR(255) NOT NULL,
        promotion_type ENUM('product_discount', 'shipping_discount', 'total_discount', 'buy_x_get_y', 'free_shipping') NOT NULL,
        
        discount_type ENUM('percentage', 'fixed_amount') DEFAULT 'percentage',
        discount_value DECIMAL(10,2),
        
        shipping_override_amount DECIMAL(10,2) NULL,
        free_shipping BOOLEAN DEFAULT FALSE,
        
        target_type ENUM('all', 'product', 'category', 'minimum_order') DEFAULT 'all',
        target_id INT(11) NULL,
        minimum_order_amount DECIMAL(10,2) NULL,
        
        usage_limit INT(11) NULL,
        usage_limit_per_user INT(11) DEFAULT 1,
        current_usage_count INT(11) DEFAULT 0,
        
        start_date DATE,
        end_date DATE,
        
        is_active BOOLEAN DEFAULT TRUE,
        priority INT(11) DEFAULT 0,
        
        description TEXT,
        terms_and_conditions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Promotions table created successfully!');

    // Create promotion_usage table
    console.log('Creating promotion_usage table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS promotion_usage (
        usage_id BIGINT(20) UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        promotion_id INT(11) UNSIGNED NOT NULL,
        user_id BIGINT(20) UNSIGNED NOT NULL,
        order_id BIGINT(20) UNSIGNED NOT NULL,
        
        discount_amount DECIMAL(10,2) NOT NULL,
        shipping_discount DECIMAL(10,2) DEFAULT 0,
        
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id),
        UNIQUE KEY unique_user_promotion (user_id, promotion_id, order_id)
      )
    `);
    console.log('Promotion_usage table created successfully!');

    // Insert test promotion
    console.log('Creating PISOSHIPPING promotion...');
    await connection.execute(`
      INSERT IGNORE INTO promotions (
        promotion_code,
        promotion_name,
        promotion_type,
        shipping_override_amount,
        minimum_order_amount,
        usage_limit,
        usage_limit_per_user,
        start_date,
        end_date,
        is_active,
        description,
        terms_and_conditions
      ) VALUES (
        'PISOSHIPPING',
        '1 Peso Shipping Promo',
        'shipping_discount',
        1.00,
        500.00,
        1000,
        1,
        '2024-01-01',
        '2025-12-31',
        TRUE,
        'Get shipping for only ₱1 on orders ₱500 and above',
        'Valid for orders with minimum amount of ₱500. Limited to one use per customer.'
      )
    `);

    // Insert free shipping promotion
    console.log('Creating FREESHIP1000 promotion...');
    await connection.execute(`
      INSERT IGNORE INTO promotions (
        promotion_code,
        promotion_name,
        promotion_type,
        free_shipping,
        minimum_order_amount,
        usage_limit_per_user,
        start_date,
        end_date,
        is_active,
        description
      ) VALUES (
        'FREESHIP1000',
        'Free Shipping on ₱1000+',
        'shipping_discount',
        TRUE,
        1000.00,
        1,
        '2024-01-01',
        '2025-12-31',
        TRUE,
        'Free shipping on orders ₱1000 and above'
      )
    `);

    console.log('✅ All promotions setup completed successfully!');
    console.log('You can now use promotion codes: PISOSHIPPING, FREESHIP1000');

  } catch (error) {
    console.error('❌ Error setting up promotions:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupPromotions();
