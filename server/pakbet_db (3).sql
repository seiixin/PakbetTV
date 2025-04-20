-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 15, 2025 at 04:20 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pakbet_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `cache`
--

CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cache_locks`
--

CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cart`
--

CREATE TABLE `cart` (
  `cart_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `variant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `category_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`category_id`, `name`, `description`, `parent_id`, `created_at`, `updated_at`) VALUES
(2, 'test', 'test', NULL, '2025-03-01 21:49:08', '2025-03-01 21:49:08'),
(5, 'mamaw', 'mamaw', NULL, '2025-03-03 07:24:50', '2025-03-03 07:24:50'),
(8, 'feng shui', 'test lang', NULL, '2025-03-14 04:48:42', '2025-03-14 04:48:42'),
(9, 'feng shui123', 'hahahaha', NULL, '2025-03-14 04:49:53', '2025-03-14 04:49:53'),
(10, 'category', 'category', NULL, '2025-03-14 05:20:02', '2025-03-14 05:20:02'),
(11, 'joshua pilarskie', 'joshua', NULL, '2025-03-31 04:58:45', '2025-03-31 04:58:45');

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `inventory_id` bigint(20) UNSIGNED NOT NULL,
  `variant_id` bigint(20) UNSIGNED NOT NULL,
  `change_type` enum('add','remove') NOT NULL,
  `quantity` int(11) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `order_status` enum('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`order_id`, `user_id`, `total_price`, `order_status`, `created_at`, `updated_at`) VALUES
(124, 5, 450.00, 'pending', '2025-03-26 05:15:37', '2025-04-05 05:41:01'),
(128, 9, 150.00, 'pending', '2025-03-26 05:15:37', '2025-04-09 00:33:12'),
(134, 8, 320.75, 'pending', '2025-03-26 05:15:37', '2025-03-25 22:00:27'),
(135, 10, 870.25, 'pending', '2025-03-26 05:15:37', '2025-04-09 00:33:19');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `order_item_id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `variant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `size` varchar(50) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `sku` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('credit_card','paypal','bank_transfer','cod') NOT NULL,
  `status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `product_code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category_id` bigint(20) UNSIGNED NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `product_code`, `name`, `description`, `category_id`, `created_at`, `updated_at`) VALUES
(60, '555555556161617171', 'Bracelet', 'hahahahah', 8, '2025-04-01 07:47:34', '2025-04-01 07:47:34'),
(61, '1111111443444', 'mamaw', '4444', 10, '2025-04-01 08:30:56', '2025-04-01 08:30:56'),
(62, '123456', 'test', 'None', 1, '2025-04-05 04:44:34', '2025-04-05 04:44:34'),
(64, '1234555555', 'test', 'test', 2, '2025-04-05 11:47:44', '2025-04-05 11:47:44'),
(65, '12345', 'Necklace', 'Good Necklace', 2, '2025-04-08 05:44:21', '2025-04-08 05:44:21');

-- --------------------------------------------------------

--
-- Table structure for table `product_variants`
--

CREATE TABLE `product_variants` (
  `variant_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `sku` varchar(50) NOT NULL,
  `size` varchar(50) NOT NULL,
  `color` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `weight` decimal(10,2) NOT NULL,
  `height` decimal(10,2) NOT NULL,
  `width` decimal(10,2) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_variants`
--

INSERT INTO `product_variants` (`variant_id`, `product_id`, `sku`, `size`, `color`, `price`, `stock`, `weight`, `height`, `width`, `image_url`, `created_at`, `updated_at`) VALUES
(24, 60, 'bbbbbaas1121', 'test', 'test', 1.00, 200, 1.00, 12.00, 1.00, 'variants/jKKBpH6ZlO258AVrYaM1B4wPn8phY5UGHxeOfM6s.png', '2025-04-01 07:48:08', '2025-04-01 07:48:08'),
(25, 61, '111', 'test', 'test', 1.00, 1111, 1.00, 1.00, 1.00, 'variants/0yak7Yka0iWFi6tsFMofJw31CC1ZBsCXGSXGIhkv.png', '2025-04-01 08:31:14', '2025-04-01 08:31:14'),
(26, 62, '121u2y1', '12', '12', 12.00, 12, 12.00, 12.00, 12.00, 'variants/mrU2WoJOpH6WGSbNswMlt5b7D8aEavVUDggB5ZUR.png', '2025-04-05 04:45:35', '2025-04-05 04:45:35');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` text NOT NULL,
  `last_activity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`id`, `user_id`, `ip_address`, `user_agent`, `payload`, `last_activity`) VALUES
('6yZD7YskNLkHR9YXOwOnbIBvWWgWqXXeOcEFo8iD', NULL, '2a02:4780:6:c0de::10', 'Go-http-client/2.0', 'YToyOntzOjY6Il90b2tlbiI7czo0MDoiVzlkU21zSmtUOTVIdlFTM3paeTZRV1lvVE5VM05JT3JjQnVueGRSaCI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1744714386),
('76HYHw95RURCKCkJ3neVssHqUw7TjHLh1bLxSsrC', NULL, '2a02:4780:6:c0de::10', 'Go-http-client/2.0', 'YToyOntzOjY6Il90b2tlbiI7czo0MDoiWmlqNDRkMFVIWWlwRG1VU2tNZVFlQmtHMGMwTUNtbEFvM1NSM1NrZiI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1744598265),
('ouikJ8ae6VnWPoBX5SdZDjaX4bOrpeEc3GpnrQBC', NULL, '136.158.42.175', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoibVhvcnVXTzZhMXhmMXZtcUtSZGZKU3dScFRvQVVVMnZwN20yNzVGbCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6NTM6Imh0dHBzOi8vcGFrYmV0dHYtYmFja29mZmljZS5nZ2hzb2Z0d2FyZWRldi5jb20vb3JkZXJzIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1744508254),
('XxstW9xpDhrox92xm0FljmKR2DzOLfbt0wmJ7yx2', NULL, '2a02:4780:6:c0de::10', 'Go-http-client/2.0', 'YToyOntzOjY6Il90b2tlbiI7czo0MDoibENwUWxOQUhwTTNlUXBQNFdDaWVodDNtemhYc1BpalFRYlF2ZEJ2RCI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1744516022);

-- --------------------------------------------------------

--
-- Table structure for table `shipping`
--

CREATE TABLE `shipping` (
  `shipping_id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `address` text NOT NULL,
  `status` enum('pending','shipped','delivered') NOT NULL DEFAULT 'pending',
  `tracking_number` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `username` varchar(100) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `user_type` enum('customer','admin') NOT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `first_name`, `username`, `last_name`, `email`, `password`, `phone`, `address`, `user_type`, `status`, `created_at`, `updated_at`) VALUES
(1, 'mamaw', '', 'Schultz', 'evon123rueden@example.org', '$2y$12$11MuHFA72V1QBFfa7ZCuce03bRUQYj0YV6x6MAmBSrIxQb5YYgaFy', '1-865-842-3017', '3026 DuBuque Fords Taga Fairview LOL\r\nRogelioview, SC 63940-4992', 'customer', 'Inactive', '2025-03-17 15:48:45', '2025-04-05 05:21:38'),
(2, 'Adrien', '', 'Grimes', 'heathcote.berneice@example.org', '$2y$12$69XLtgJAMHjbxR.IFgpcnOoOUTJc46DwflQJwKbB6SxlOyqcxuzDu', '(802) 323-2489', '69101 Willms Village\nTurcotteville, IL 19430', 'customer', 'Active', '2025-03-17 15:48:45', '2025-04-05 04:36:55'),
(3, 'Bianka', '', 'Runtes', 'donato123.kunze@example.org', '$2y$12$rd4MS1CoRGdwIRcc8V2IDO7CeXLiVhLxW/s0kIFUK.mCHnxhCjQku', '541.405.5155', '5345 Borers Cape Apt. 699\r\nEast Breannechester, WI 70350-9882', 'customer', 'Active', '2025-03-17 15:48:45', '2025-04-05 04:36:55'),
(4, 'Abner', '', 'Heidenreich', 'coconnell@example.net', '$2y$12$6KND94hC5Q9bZ4fseZ8po.PSo4BFAqSxsHHay0JKhRzyYl2rmLUpq', '1-762-840-7975', '82184 Gerhold Mission\nFramifort, AR 31911-4743', 'customer', 'Active', '2025-03-17 15:48:45', '2025-04-05 04:36:55'),
(5, 'Alberto', '', 'Hintz', 'korey.doyle@example.com', '$2y$12$UFhw3dJzhDPkDyV9soHGluAT7c3SG8X8cr5bOSow0tAy8Sj5t17bq', '1-747-619-6179', '63593 Caesar Harbors Apt. 809\nPort Violette, MN 78564', 'customer', 'Active', '2025-03-17 15:48:45', '2025-04-05 04:36:55'),
(6, 'Nelda', '', 'Schimmel', 'wkihn@example.org', '$2y$12$sUjxCBjk.01obBEXAWe28Ond7GBW0wdxBXiqk5sVwOeZnE7nAXLfi', '971-398-1649', '3070 Carter Burg Apt. 814\nDustychester, TX 64199', 'customer', 'Active', '2025-03-17 15:48:46', '2025-04-05 04:36:55'),
(7, 'Dell', '', 'Zemlak', 'gmraz@example.com', '$2y$12$FulgRUCpNIyUCf7zgphiT.zVXFka3ZvbFkvhr3IEJqLODcGXMNfgu', '+1.843.656.0145', '71220 Will Meadows Suite 410\nTomasaside, WI 60155', 'customer', 'Active', '2025-03-17 15:48:46', '2025-04-05 04:36:55'),
(8, 'Edwin', '', 'Beer', 'dbarrows@example.org', '$2y$12$NUUqPYd98Bf8PMzlgeFvfuptL0aZUTT/dxVmvLL9DTOSiBhfBuEPW', '469-354-9847', '74770 Hailey Ranch\nNorth Jerroldside, SC 13411', 'customer', 'Active', '2025-03-17 15:48:46', '2025-04-05 04:36:55'),
(9, 'Sabina', '', 'Cormier', 'lea.mckenzie@example.com', '$2y$12$9/JHC.3i8Mtk.qV1REx.7u.2AZTKqYukfsBjElqy6IPcFd5h5t1Je', '+1-949-643-4984', '28999 O\'Keefe Summit\nSouth Breannaborough, OK 83576-7453', 'customer', 'Active', '2025-03-17 15:48:46', '2025-04-05 04:36:55'),
(10, 'Sabina', '', 'Streich', 'jconroy@example.com', '$2y$12$qWBUf0Vu04nKVwnIBvi31Oc9nVuS1zi1V58xwLybB2UZ1hZ1Nux9y', '309-953-7008', '3488 Haag Meadows Apt. 645\nNew Mohamed, ME 10222', 'customer', 'Active', '2025-03-17 15:48:46', '2025-04-05 04:36:55'),
(11, 'ggh', 'ggh', 'ggh', 'ggh@gmail.com', '$2y$12$KzkqJsi6ol746MzG3urvnetqKf5vbyUIeLBB67dsVltazkciqCfg.', '09949768791', 'Dalhia West Fairview Quezon City', 'admin', 'Active', '2025-03-31 07:47:58', '2025-03-31 07:47:58'),
(12, 'Joshua', 'Joshua', 'Pilar', 'joshualancep128@gmail.com', '$2y$12$lCBB7r6KaYBY534wD5k60.35ge8zhtCrZcUQso4NYjWHyOVTUkOna', '09762140552', 'Test Street', 'admin', 'Active', '2025-04-05 05:06:00', '2025-04-05 05:06:00');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cache`
--
ALTER TABLE `cache`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `cache_locks`
--
ALTER TABLE `cache_locks`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `cart`
--
ALTER TABLE `cart`
  ADD PRIMARY KEY (`cart_id`),
  ADD KEY `cart_user_id_foreign` (`user_id`),
  ADD KEY `cart_product_id_foreign` (`product_id`),
  ADD KEY `cart_variant_id_foreign` (`variant_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `categories_name_unique` (`name`),
  ADD KEY `categories_parent_id_foreign` (`parent_id`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`inventory_id`),
  ADD KEY `inventory_variant_id_foreign` (`variant_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `orders_user_id_foreign` (`user_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `order_items_order_id_foreign` (`order_id`),
  ADD KEY `order_items_product_id_foreign` (`product_id`),
  ADD KEY `order_items_variant_id_foreign` (`variant_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD UNIQUE KEY `products_product_code_unique` (`product_code`),
  ADD KEY `products_category_id_foreign` (`category_id`);

--
-- Indexes for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`variant_id`),
  ADD UNIQUE KEY `product_variants_sku_unique` (`sku`),
  ADD KEY `product_variants_product_id_foreign` (`product_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sessions_user_id_index` (`user_id`),
  ADD KEY `sessions_last_activity_index` (`last_activity`);

--
-- Indexes for table `shipping`
--
ALTER TABLE `shipping`
  ADD PRIMARY KEY (`shipping_id`),
  ADD KEY `shipping_order_id_foreign` (`order_id`),
  ADD KEY `shipping_user_id_foreign` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cart`
--
ALTER TABLE `cart`
  MODIFY `cart_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `category_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `inventory_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=137;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `order_item_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=66;

--
-- AUTO_INCREMENT for table `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `variant_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `shipping`
--
ALTER TABLE `shipping`
  MODIFY `shipping_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cart`
--
ALTER TABLE `cart`
  ADD CONSTRAINT `cart_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cart_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cart_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE SET NULL;

--
-- Constraints for table `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `categories_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE;

--
-- Constraints for table `inventory`
--
ALTER TABLE `inventory`
  ADD CONSTRAINT `inventory_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  ADD CONSTRAINT `order_items_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
