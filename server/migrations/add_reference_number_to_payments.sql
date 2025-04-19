-- Add reference_number column to payments table
ALTER TABLE `payments` 
ADD COLUMN `reference_number` VARCHAR(50) NULL AFTER `status`;

-- Add dragonpay as a payment method option
ALTER TABLE `payments` 
MODIFY COLUMN `payment_method` ENUM('credit_card', 'paypal', 'bank_transfer', 'cod', 'dragonpay') NOT NULL;

-- Add payment_status column to orders table if it doesn't exist
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `payment_status` ENUM('pending', 'paid', 'failed', 'refunded') 
NOT NULL DEFAULT 'pending' AFTER `order_status`; 