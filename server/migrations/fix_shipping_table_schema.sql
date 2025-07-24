-- Fix shipping table schema issues
-- This migration addresses the "Unknown column 'order_id'" error

-- First, let's check if the shipping table exists and its current structure
-- If the table doesn't exist, create it
CREATE TABLE IF NOT EXISTS `shipping` (
  `shipping_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `address` text NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `carrier` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`shipping_id`),
  KEY `idx_shipping_order_id` (`order_id`),
  KEY `idx_shipping_user_id` (`user_id`),
  KEY `idx_shipping_tracking` (`tracking_number`),
  CONSTRAINT `shipping_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `shipping_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If the table exists but is missing columns, add them
ALTER TABLE `shipping` 
ADD COLUMN IF NOT EXISTS `order_id` bigint(20) UNSIGNED NOT NULL AFTER `shipping_id`,
ADD COLUMN IF NOT EXISTS `user_id` bigint(20) UNSIGNED NOT NULL AFTER `order_id`,
ADD COLUMN IF NOT EXISTS `phone` varchar(20) DEFAULT NULL AFTER `status`,
ADD COLUMN IF NOT EXISTS `email` varchar(255) DEFAULT NULL AFTER `phone`,
ADD COLUMN IF NOT EXISTS `name` varchar(255) DEFAULT NULL AFTER `email`,
ADD COLUMN IF NOT EXISTS `tracking_number` varchar(100) DEFAULT NULL AFTER `name`,
ADD COLUMN IF NOT EXISTS `carrier` varchar(50) DEFAULT NULL AFTER `tracking_number`;

-- Ensure AUTO_INCREMENT is properly set
ALTER TABLE `shipping` MODIFY COLUMN `shipping_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

-- Add indexes if they don't exist
ALTER TABLE `shipping` 
ADD INDEX IF NOT EXISTS `idx_shipping_order_id` (`order_id`),
ADD INDEX IF NOT EXISTS `idx_shipping_user_id` (`user_id`),
ADD INDEX IF NOT EXISTS `idx_shipping_tracking` (`tracking_number`);

-- Add foreign key constraints if they don't exist
-- Note: We need to check if foreign keys exist first to avoid errors
SET @exist_order_fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
                       WHERE CONSTRAINT_SCHEMA = DATABASE() 
                       AND TABLE_NAME = 'shipping' 
                       AND CONSTRAINT_NAME = 'shipping_order_id_foreign' 
                       AND CONSTRAINT_TYPE = 'FOREIGN KEY');

SET @exist_user_fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
                      WHERE CONSTRAINT_SCHEMA = DATABASE() 
                      AND TABLE_NAME = 'shipping' 
                      AND CONSTRAINT_NAME = 'shipping_user_id_foreign' 
                      AND CONSTRAINT_TYPE = 'FOREIGN KEY');

SET @sql_order_fk = IF(@exist_order_fk = 0, 
  'ALTER TABLE `shipping` ADD CONSTRAINT `shipping_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE', 
  'SELECT "Order foreign key already exists"');

SET @sql_user_fk = IF(@exist_user_fk = 0, 
  'ALTER TABLE `shipping` ADD CONSTRAINT `shipping_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE', 
  'SELECT "User foreign key already exists"');

PREPARE stmt_order_fk FROM @sql_order_fk;
EXECUTE stmt_order_fk;
DEALLOCATE PREPARE stmt_order_fk;

PREPARE stmt_user_fk FROM @sql_user_fk;
EXECUTE stmt_user_fk;
DEALLOCATE PREPARE stmt_user_fk;

-- Verify the table structure
SELECT 'Shipping table structure after migration:' as status;
DESCRIBE shipping;