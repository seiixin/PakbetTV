-- Add reference_number column to payments table
ALTER TABLE payments ADD COLUMN reference_number VARCHAR(100) AFTER payment_method;

-- Add txn_id column as an alternative (if you prefer this name)
-- ALTER TABLE payments ADD COLUMN txn_id VARCHAR(100) AFTER payment_method;

-- Add indexes for better query performance (optional but recommended)
ALTER TABLE payments ADD INDEX idx_reference_number (reference_number);
-- ALTER TABLE payments ADD INDEX idx_txn_id (txn_id);

-- Optional: Add created_at and updated_at columns if not already using triggers
-- I noticed these columns in your schema but make sure they're properly handled:
-- 
-- DELIMITER //
-- CREATE TRIGGER payments_before_insert
-- BEFORE INSERT ON payments
-- FOR EACH ROW
-- BEGIN
--   IF NEW.created_at IS NULL THEN
--     SET NEW.created_at = NOW();
--   END IF;
--   SET NEW.updated_at = NOW();
-- END //
-- 
-- CREATE TRIGGER payments_before_update
-- BEFORE UPDATE ON payments
-- FOR EACH ROW
-- BEGIN
--   SET NEW.updated_at = NOW();
-- END //
-- DELIMITER ;

-- Add dragonpay as a payment method option
ALTER TABLE `payments` 
MODIFY COLUMN `payment_method` ENUM('credit_card', 'paypal', 'bank_transfer', 'cod', 'dragonpay') NOT NULL;

-- Add payment_status column to orders table if it doesn't exist
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `payment_status` ENUM('pending', 'paid', 'failed', 'refunded') 
NOT NULL DEFAULT 'pending' AFTER `order_status`; 

-- ***** NEW: Add Reviews Functionality *****

-- 1. Create the reviews table
CREATE TABLE IF NOT EXISTS `reviews` (
  `review_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `rating` TINYINT UNSIGNED NOT NULL COMMENT 'Rating from 1 to 5',
  `review_text` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  INDEX `idx_review_product` (`product_id` ASC),
  INDEX `idx_review_user` (`user_id` ASC),
  CONSTRAINT `fk_review_product`
    FOREIGN KEY (`product_id`)
    REFERENCES `products` (`product_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_review_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- 2. Add aggregated rating columns to products table
ALTER TABLE `products` 
ADD COLUMN `average_rating` DECIMAL(3, 2) NULL DEFAULT NULL AFTER `category_id`,
ADD COLUMN `review_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `average_rating`;

-- Optional: Add an index for faster lookup based on rating (if needed later)
-- ALTER TABLE `products` ADD INDEX `idx_product_rating` (`average_rating` DESC);

-- ***** END: Add Reviews Functionality *****

-- ***** NEW: Add Multiple Product Images Functionality *****

-- 1. Create the product_images table
CREATE TABLE IF NOT EXISTS `product_images` (
  `image_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `alt_text` VARCHAR(255) NULL,
  `sort_order` INT UNSIGNED NULL DEFAULT 0, 
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  INDEX `idx_product_image_product` (`product_id` ASC),
  CONSTRAINT `fk_product_image_product`
    FOREIGN KEY (`product_id`)
    REFERENCES `products` (`product_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- 2. Optional: Consider removing image_url from product_variants if images are now product-level
--    If you still want one main image per variant, keep it.
--    If images are ONLY product-level, you might run:
--    ALTER TABLE `product_variants` DROP COLUMN `image_url`;

-- ***** END: Add Multiple Product Images Functionality ***** 