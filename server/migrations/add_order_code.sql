-- Add order_code column to orders table
ALTER TABLE `orders` 
ADD COLUMN `order_code` varchar(36) DEFAULT NULL AFTER `order_id`,
ADD UNIQUE INDEX `orders_order_code_unique` (`order_code`);

-- Update existing orders with a UUID-based order_code
UPDATE `orders` 
SET `order_code` = UUID()
WHERE `order_code` IS NULL; 