-- Create vouchers table
CREATE TABLE IF NOT EXISTS `vouchers` (
  `voucher_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` ENUM('shipping', 'total_price') NOT NULL,
  `discount_type` ENUM('percentage', 'fixed') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `max_discount` decimal(10,2) DEFAULT NULL,
  `min_order_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `max_redemptions` int(11) DEFAULT NULL,
  `current_redemptions` int(11) DEFAULT 0,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`voucher_id`),
  KEY `idx_vouchers_code` (`code`),
  KEY `idx_vouchers_active` (`is_active`),
  KEY `idx_vouchers_dates` (`start_date`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 