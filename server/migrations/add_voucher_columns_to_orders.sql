-- Add voucher_id column to orders table to track which voucher was used
ALTER TABLE `orders` 
ADD COLUMN `voucher_id` bigint(20) UNSIGNED DEFAULT NULL AFTER `user_id`,
ADD COLUMN `voucher_discount` decimal(10,2) DEFAULT 0.00 AFTER `total_price`,
ADD KEY `idx_orders_voucher_id` (`voucher_id`),
ADD CONSTRAINT `orders_voucher_id_foreign` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`voucher_id`) ON DELETE SET NULL; 