-- Fix user_shipping_details table to ensure compatibility with both standard and Philippine address formats

-- Check if the table exists
SET @tableExists = 0;
SELECT COUNT(*) INTO @tableExists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'user_shipping_details';

-- Create the table if it doesn't exist
SET @createTable = IF(@tableExists = 0, 
'CREATE TABLE user_shipping_details (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  address1 VARCHAR(255) NOT NULL,
  address2 VARCHAR(255) DEFAULT NULL,
  area VARCHAR(255) DEFAULT NULL,
  city VARCHAR(255) DEFAULT NULL,
  state VARCHAR(255) DEFAULT NULL,
  postcode VARCHAR(20) DEFAULT NULL,
  country VARCHAR(2) DEFAULT "PH",
  address_type VARCHAR(20) DEFAULT "home",
  is_default TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Philippine-specific fields
  region VARCHAR(100) DEFAULT NULL,
  province VARCHAR(100) DEFAULT NULL,
  city_municipality VARCHAR(100) DEFAULT NULL,
  barangay VARCHAR(100) DEFAULT NULL,
  street_name VARCHAR(255) DEFAULT NULL,
  building VARCHAR(255) DEFAULT NULL,
  house_number VARCHAR(50) DEFAULT NULL,
  address_format VARCHAR(20) DEFAULT "standard",
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
)',
'SELECT "Table user_shipping_details already exists" AS message');

PREPARE stmt FROM @createTable;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add columns if they don't exist (for when the table already exists but is missing columns)
SET @alterPhAddressColumns = '
  ALTER TABLE user_shipping_details 
  ADD COLUMN IF NOT EXISTS region VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS province VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS city_municipality VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS barangay VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS street_name VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS building VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS house_number VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS address_format VARCHAR(20) DEFAULT "standard"
';

-- Only run the alter table if the table already exists
IF @tableExists > 0 THEN
  PREPARE stmt FROM @alterPhAddressColumns;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END IF;

-- Check if the trigger exists and create it if it doesn't
DELIMITER //

DROP TRIGGER IF EXISTS before_user_shipping_details_insert //
CREATE TRIGGER before_user_shipping_details_insert
BEFORE INSERT ON user_shipping_details
FOR EACH ROW
BEGIN
    IF NEW.country = 'PH' THEN
        SET NEW.address_format = 'philippines';
        -- Combine Philippine format into address1 for compatibility
        SET NEW.address1 = CONCAT_WS(', ',
            NULLIF(NEW.house_number, ''),
            NULLIF(NEW.building, ''),
            NULLIF(NEW.street_name, ''),
            NULLIF(NEW.barangay, '')
        );
        SET NEW.address2 = CONCAT_WS(', ',
            NULLIF(NEW.city_municipality, ''),
            NULLIF(NEW.province, ''),
            NULLIF(NEW.region, '')
        );
    END IF;
END //

DROP TRIGGER IF EXISTS before_user_shipping_details_update //
CREATE TRIGGER before_user_shipping_details_update
BEFORE UPDATE ON user_shipping_details
FOR EACH ROW
BEGIN
    IF NEW.country = 'PH' THEN
        SET NEW.address_format = 'philippines';
        -- Combine Philippine format into address1 for compatibility
        SET NEW.address1 = CONCAT_WS(', ',
            NULLIF(NEW.house_number, ''),
            NULLIF(NEW.building, ''),
            NULLIF(NEW.street_name, ''),
            NULLIF(NEW.barangay, '')
        );
        SET NEW.address2 = CONCAT_WS(', ',
            NULLIF(NEW.city_municipality, ''),
            NULLIF(NEW.province, ''),
            NULLIF(NEW.region, '')
        );
    END IF;
END //

DELIMITER ;

-- Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_user_shipping_user_id ON user_shipping_details(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shipping_default ON user_shipping_details(user_id, is_default); 