-- Create user_shipping_details table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_shipping_details (
  id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id bigint(20) UNSIGNED NOT NULL,
  address1 varchar(255) NOT NULL,
  address2 varchar(255) DEFAULT NULL,
  area varchar(255) DEFAULT NULL,
  city varchar(255) NOT NULL,
  state varchar(255) NOT NULL,
  postcode varchar(20) NOT NULL,
  country varchar(2) DEFAULT 'MY',
  address_type varchar(20) DEFAULT 'home',
  is_default tinyint(1) DEFAULT 0,
  created_at timestamp NULL DEFAULT current_timestamp(),
  updated_at timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id),
  KEY idx_user_id (user_id),
  KEY idx_is_default (is_default),
  CONSTRAINT fk_shipping_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add trigger to ensure at least one default address per user if any exists
DELIMITER //

CREATE TRIGGER IF NOT EXISTS ensure_default_address
AFTER DELETE ON user_shipping_details
FOR EACH ROW
BEGIN
    DECLARE address_count INT;
    DECLARE has_default INT;
    
    IF OLD.is_default = 1 THEN
        -- Count remaining addresses for this user
        SELECT COUNT(*), SUM(is_default) 
        INTO address_count, has_default
        FROM user_shipping_details 
        WHERE user_id = OLD.user_id;
        
        -- If there are addresses but no default, make the oldest one default
        IF address_count > 0 AND (has_default IS NULL OR has_default = 0) THEN
            UPDATE user_shipping_details 
            SET is_default = 1 
            WHERE user_id = OLD.user_id 
            ORDER BY created_at ASC 
            LIMIT 1;
        END IF;
    END IF;
END //

DELIMITER ; 