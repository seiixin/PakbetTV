-- Implementation of Shipping Details tables for Pakbet E-Commerce
-- This implementation avoids data redundancy while meeting NinjaVan requirements

-- Create shipping_details table if it doesn't exist
CREATE TABLE IF NOT EXISTS `shipping_details` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `address1` varchar(255) NOT NULL,
  `address2` varchar(255) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `postcode` varchar(20) DEFAULT NULL,
  `country` varchar(2) DEFAULT 'MY',
  `address_type` varchar(20) DEFAULT 'home',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `shipping_details_order_id_foreign` (`order_id`),
  CONSTRAINT `shipping_details_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create webhook_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS `webhook_logs` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider` varchar(50) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `payload` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `webhook_logs_provider_index` (`provider`),
  KEY `webhook_logs_event_type_index` (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create tracking_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS `tracking_events` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tracking_number` varchar(100) NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `status` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tracking_events_tracking_number_index` (`tracking_number`),
  KEY `tracking_events_order_id_index` (`order_id`),
  CONSTRAINT `tracking_events_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Modify shipping table to add carrier field if not exists
ALTER TABLE `shipping` 
ADD COLUMN IF NOT EXISTS `carrier` varchar(50) DEFAULT NULL AFTER `tracking_number`;

-- Add stored procedure to migrate existing shipping addresses to structured format
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS migrate_shipping_addresses()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE order_id_val BIGINT;
    DECLARE address_val TEXT;
    DECLARE cur CURSOR FOR 
        SELECT order_id, address FROM shipping 
        WHERE order_id NOT IN (SELECT order_id FROM shipping_details);
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO order_id_val, address_val;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Extract postcode
        SET @postcode = NULL;
        SET @postcode_match = REGEXP_SUBSTR(address_val, '[0-9]{5,6}');
        IF @postcode_match IS NOT NULL THEN
            SET @postcode = @postcode_match;
        END IF;
        
        -- Split address by commas
        SET @address_parts = address_val;
        SET @address1 = SUBSTRING_INDEX(@address_parts, ',', 1);
        SET @address_parts = TRIM(SUBSTRING(@address_parts, LENGTH(@address1) + 2));
        
        SET @city = NULL;
        SET @state = NULL;
        
        -- If we have more address parts
        IF LENGTH(@address_parts) > 0 THEN
            -- Last part is likely state
            SET @state = TRIM(SUBSTRING_INDEX(@address_parts, ',', -1));
            SET @address_parts = TRIM(SUBSTRING(@address_parts, 1, LENGTH(@address_parts) - LENGTH(@state) - 1));
            
            -- Second last part is likely city
            IF LENGTH(@address_parts) > 0 THEN
                SET @city = TRIM(SUBSTRING_INDEX(@address_parts, ',', -1));
                SET @address_parts = TRIM(SUBSTRING(@address_parts, 1, LENGTH(@address_parts) - LENGTH(@city) - 1));
            END IF;
        END IF;
        
        -- Insert into shipping_details
        INSERT INTO shipping_details (
            order_id, address1, city, state, postcode, country
        ) VALUES (
            order_id_val, 
            @address1, 
            @city, 
            @state, 
            @postcode,
            'MY'
        );
    END LOOP;
    
    CLOSE cur;
END //
DELIMITER ;

-- Create a trigger to keep shipping and shipping_details synchronized
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_shipping_insert
AFTER INSERT ON shipping
FOR EACH ROW
BEGIN
    -- If address is in generic format and no shipping_details entry exists yet
    IF NOT EXISTS (SELECT 1 FROM shipping_details WHERE order_id = NEW.order_id) THEN
        -- Extract postcode
        SET @postcode = NULL;
        SET @postcode_match = REGEXP_SUBSTR(NEW.address, '[0-9]{5,6}');
        IF @postcode_match IS NOT NULL THEN
            SET @postcode = @postcode_match;
        END IF;
        
        -- Split address by commas
        SET @address_parts = NEW.address;
        SET @address1 = SUBSTRING_INDEX(@address_parts, ',', 1);
        SET @address_parts = TRIM(SUBSTRING(@address_parts, LENGTH(@address1) + 2));
        
        SET @city = NULL;
        SET @state = NULL;
        
        -- If we have more address parts
        IF LENGTH(@address_parts) > 0 THEN
            -- Last part is likely state
            SET @state = TRIM(SUBSTRING_INDEX(@address_parts, ',', -1));
            SET @address_parts = TRIM(SUBSTRING(@address_parts, 1, LENGTH(@address_parts) - LENGTH(@state) - 1));
            
            -- Second last part is likely city
            IF LENGTH(@address_parts) > 0 THEN
                SET @city = TRIM(SUBSTRING_INDEX(@address_parts, ',', -1));
            END IF;
        END IF;
        
        -- Insert into shipping_details
        INSERT INTO shipping_details (
            order_id, address1, city, state, postcode, country
        ) VALUES (
            NEW.order_id, 
            @address1, 
            @city, 
            @state, 
            @postcode,
            'MY'
        );
    END IF;
END //
DELIMITER ; 