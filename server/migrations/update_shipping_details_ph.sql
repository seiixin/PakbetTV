-- Add Philippine-specific columns to user_shipping_details
ALTER TABLE user_shipping_details
ADD COLUMN unit_number VARCHAR(50) NULL,
ADD COLUMN subdivision VARCHAR(100) NULL,
ADD COLUMN landmark TEXT NULL,
ADD COLUMN region VARCHAR(100) NULL,
ADD COLUMN province VARCHAR(100) NULL,
ADD COLUMN city_municipality VARCHAR(100) NULL,
ADD COLUMN barangay VARCHAR(100) NULL,
ADD COLUMN street_name VARCHAR(255) NULL,
ADD COLUMN building VARCHAR(255) NULL,
ADD COLUMN house_number VARCHAR(50) NULL,
ADD COLUMN address_format VARCHAR(20) DEFAULT 'standard';

-- Add Philippine-specific columns to shipping_details
ALTER TABLE shipping_details
ADD COLUMN unit_number VARCHAR(50) NULL,
ADD COLUMN subdivision VARCHAR(100) NULL,
ADD COLUMN landmark TEXT NULL,
ADD COLUMN region VARCHAR(100) NULL,
ADD COLUMN province VARCHAR(100) NULL,
ADD COLUMN city_municipality VARCHAR(100) NULL,
ADD COLUMN barangay VARCHAR(100) NULL,
ADD COLUMN street_name VARCHAR(255) NULL,
ADD COLUMN building VARCHAR(255) NULL,
ADD COLUMN house_number VARCHAR(50) NULL,
ADD COLUMN address_format VARCHAR(20) DEFAULT 'standard';

-- Create a trigger to format addresses based on country
DELIMITER //

CREATE TRIGGER before_user_shipping_details_insert 
BEFORE INSERT ON user_shipping_details
FOR EACH ROW
BEGIN
    IF NEW.country = 'PH' THEN
        SET NEW.address_format = 'philippines';
        -- Combine Philippine format into address1 for NinjaVan compatibility
        SET NEW.address1 = CONCAT_WS(', ',
            NULLIF(CONCAT_WS(' ', 
                NULLIF(NEW.unit_number, ''),
                NULLIF(NEW.house_number, '')
            ), ''),
            NULLIF(NEW.building, ''),
            NULLIF(NEW.street_name, ''),
            NULLIF(NEW.subdivision, ''),
            NULLIF(NEW.barangay, '')
        );
        SET NEW.address2 = CONCAT_WS(', ',
            NULLIF(NEW.city_municipality, ''),
            NULLIF(NEW.province, ''),
            NULLIF(NEW.region, '')
        );
        -- Add landmark to area field for NinjaVan compatibility
        IF NEW.landmark IS NOT NULL AND NEW.landmark != '' THEN
            SET NEW.area = NEW.landmark;
        END IF;
    END IF;
END//

CREATE TRIGGER before_user_shipping_details_update
BEFORE UPDATE ON user_shipping_details
FOR EACH ROW
BEGIN
    IF NEW.country = 'PH' THEN
        SET NEW.address_format = 'philippines';
        -- Combine Philippine format into address1 for NinjaVan compatibility
        SET NEW.address1 = CONCAT_WS(', ',
            NULLIF(CONCAT_WS(' ', 
                NULLIF(NEW.unit_number, ''),
                NULLIF(NEW.house_number, '')
            ), ''),
            NULLIF(NEW.building, ''),
            NULLIF(NEW.street_name, ''),
            NULLIF(NEW.subdivision, ''),
            NULLIF(NEW.barangay, '')
        );
        SET NEW.address2 = CONCAT_WS(', ',
            NULLIF(NEW.city_municipality, ''),
            NULLIF(NEW.province, ''),
            NULLIF(NEW.region, '')
        );
        -- Add landmark to area field for NinjaVan compatibility
        IF NEW.landmark IS NOT NULL AND NEW.landmark != '' THEN
            SET NEW.area = NEW.landmark;
        END IF;
    END IF;
END//

DELIMITER ; 