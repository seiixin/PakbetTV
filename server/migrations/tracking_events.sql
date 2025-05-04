CREATE TABLE IF NOT EXISTS `tracking_events` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tracking_number` varchar(100) NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `status` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `tracking_events_tracking_number_index` (`tracking_number`),
  KEY `tracking_events_order_id_index` (`order_id`),
  CONSTRAINT `tracking_events_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 