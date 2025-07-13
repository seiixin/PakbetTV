-- Create voucher_redemptions table to track voucher usage
CREATE TABLE IF NOT EXISTS `voucher_redemptions` (
  `redemption_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `voucher_id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `discount_amount` decimal(10,2) NOT NULL,
  `applied_to` ENUM('total_price', 'shipping') NOT NULL,
  `redeemed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`redemption_id`),
  KEY `idx_voucher_redemptions_voucher_id` (`voucher_id`),
  KEY `idx_voucher_redemptions_order_id` (`order_id`),
  KEY `idx_voucher_redemptions_user_id` (`user_id`),
  CONSTRAINT `voucher_redemptions_voucher_id_foreign` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`voucher_id`) ON DELETE CASCADE,
  CONSTRAINT `voucher_redemptions_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `voucher_redemptions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 