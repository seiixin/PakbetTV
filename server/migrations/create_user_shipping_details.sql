-- Create user_shipping_details table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_shipping_details (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  address1 VARCHAR(255) NOT NULL,
  address2 VARCHAR(255),
  barangay VARCHAR(100),
  city_municipality VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  region VARCHAR(100) NOT NULL,
  postcode VARCHAR(20) NOT NULL,
  country VARCHAR(2) DEFAULT 'PH',
  address_type VARCHAR(20) DEFAULT 'home',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Make sure we have proper indexes
CREATE INDEX IF NOT EXISTS idx_user_shipping_user_id ON user_shipping_details(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shipping_default ON user_shipping_details(user_id, is_default); 