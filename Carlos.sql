-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: May 01, 2025 at 10:42 AM
-- Server version: 10.11.10-MariaDB
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u590239395_pakbettv_db`
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
  `quantity` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
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
(11, 'joshua pilarskie', 'joshua', NULL, '2025-03-31 04:58:45', '2025-03-31 04:58:45'),
(13, 'Joshua', 'Testing', 2, '2025-04-28 00:00:00', '2025-04-28 00:00:00'),
(14, 'dsadadas', 'sdada', NULL, '2025-04-28 00:00:00', '2025-04-28 00:00:00');

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
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '0001_01_01_000000_create_users_table', 1),
(2, '0001_01_01_000001_create_cache_table', 1),
(3, '2025_02_27_041806_create_categories_table', 1),
(4, '2025_02_27_042043_create_products_table', 1),
(5, '2025_02_27_042239_create_product_variants_table', 1),
(6, '2025_02_27_042606_create_inventory_table', 1),
(7, '2025_02_27_064641_create_orders_table', 1),
(8, '2025_02_27_064828_create_order_items_table', 1),
(9, '2025_02_27_064856_create_payments_table', 1),
(10, '2025_02_27_065134_create_cart_table', 1),
(11, '2025_02_27_065201_create_shipping_table', 1),
(13, '2025_02_28_143104_create_sessions_table', 2);

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
(135, 10, 870.25, 'pending', '2025-03-26 05:15:37', '2025-04-09 00:33:19'),
(137, 1, 123.00, 'processing', '2025-03-05 00:00:00', '2025-04-07 00:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `order_item_id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pakbet_tv_uggroups`
--

CREATE TABLE `pakbet_tv_uggroups` (
  `GroupID` int(11) NOT NULL,
  `Label` varchar(300) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pakbet_tv_ugmembers`
--

CREATE TABLE `pakbet_tv_ugmembers` (
  `UserName` varchar(300) NOT NULL,
  `GroupID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Dumping data for table `pakbet_tv_ugmembers`
--

INSERT INTO `pakbet_tv_ugmembers` (`UserName`, `GroupID`) VALUES
('admin', -1);

-- --------------------------------------------------------

--
-- Table structure for table `pakbet_tv_ugrights`
--

CREATE TABLE `pakbet_tv_ugrights` (
  `TableName` varchar(300) NOT NULL,
  `GroupID` int(11) NOT NULL,
  `AccessMask` varchar(10) DEFAULT NULL,
  `Page` mediumtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Dumping data for table `pakbet_tv_ugrights`
--

INSERT INTO `pakbet_tv_ugrights` (`TableName`, `GroupID`, `AccessMask`, `Page`) VALUES
('cart', -1, 'ADESPIM', NULL),
('categories', -1, 'ADESPIM', NULL),
('inventory', -1, 'ADESPIM', NULL),
('orders', -1, 'ADESPIM', NULL),
('order_items', -1, 'ADESPIM', NULL),
('payments', -1, 'ADESPIM', NULL),
('products', -1, 'ADESPIM', NULL),
('product_images', -1, 'ADESPIM', NULL),
('product_variants', -1, 'ADESPIM', NULL),
('reviews', -1, 'ADESPIM', NULL),
('sessions', -1, 'ADESPIM', NULL),
('shipping', -1, 'ADESPIM', NULL),
('system_users', -1, 'ADESPIM', NULL),
('users', -1, 'ADESPIM', NULL);

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
-- Table structure for table `product_images`
--

CREATE TABLE `product_images` (
  `image_id` int(11) NOT NULL,
  `product_id` bigint(20) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Dumping data for table `product_images`
--

INSERT INTO `product_images` (`image_id`, `product_id`, `image_url`, `alt_text`, `sort_order`, `created_at`) VALUES
(1, 60, '[{\"name\":\"files\\/86ce1f8f-87a5-44c5-856d-a5303d9ec493_mvfmc35h.png\",\"usrName\":\"86ce1f8f-87a5-44c5-856d-a5303d9ec493.png\",\"size\":2572050,\"type\":\"image\\/png\",\"thumbnail\":\"files\\/th86ce1f8f-87a5-44c5-856d-a5303d9ec493_rptffwy1.png\",\"thumbnail_type\":\"image\\/p', 'Test', 123, '2025-04-26 00:00:00');

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
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
('8PRD9jZvMFGbF1Yf58xEY5zgmbDQSUfWcaRXbkul', NULL, '205.169.39.134', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiaWRpYzdyM2prZzBINk45Nlh2RExTakltcnVMNjV4SGhQNVNLWnVVYyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6NDc6Imh0dHBzOi8vYmFjay1vZmZpY2UucGFrYmV0dHYuZ2doc29mdHdhcmVkZXYuY29tIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1746019518),
('9G5ZlezpTHUmBznwSFnOQjgBGiamaTSDZLzMVop4', NULL, '104.152.52.144', 'curl/7.61.1', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiZ2U0WHlSUm5JV3NJWEQ1TU1YSmRicnVtY3RQdklwTkxqTGp5ckI0WiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6NDc6Imh0dHBzOi8vYmFjay1vZmZpY2UucGFrYmV0dHYuZ2doc29mdHdhcmVkZXYuY29tIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1745983339),
('iLa98GboRv1beRKwZcgeUqTtIz7cixi6zX0gV0p5', NULL, '205.169.39.134', 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiNkdNQThhN24yZmtvdUUweVdtNjlrZjRMVlNlVEpHQU9sazY1Zjl3QSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6NDc6Imh0dHBzOi8vYmFjay1vZmZpY2UucGFrYmV0dHYuZ2doc29mdHdhcmVkZXYuY29tIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1746019512),
('iLDlsQwuWRMyXdcVUZokUeVpavJYU4WBSlIyPIHU', NULL, '91.84.87.137', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiekFCa1JBUjN3dEV4aUlTWFN5TXhrWUc4Y2wxanduM3Ztb1RZTHlTZiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6NDc6Imh0dHBzOi8vYmFjay1vZmZpY2UucGFrYmV0dHYuZ2doc29mdHdhcmVkZXYuY29tIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1745986423),
('nClZ9jYuyNtj6CUEbJU1LD9XBGls5WGTPL4llIH6', NULL, '47.236.20.169', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiUE9qOGNxZjRLdERsbGUwUUtqQklEa1IyU29qTHJQY2oyR2dNTHluaiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6NDc6Imh0dHBzOi8vYmFjay1vZmZpY2UucGFrYmV0dHYuZ2doc29mdHdhcmVkZXYuY29tIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1745991274),
('OTPlplVjhnxJiJ7zT63k5GXxeIPhea1Yp1U0scbE', NULL, '34.118.58.190', 'Mozilla/5.0 (iPhone13,2; U; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/15E148 Safari/602.1', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoia0FRb0dRTTkzcEZlQkJTaXR3NG5FbUdjSFJmMWlqeUVJbFZEbTllYSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6NDc6Imh0dHBzOi8vYmFjay1vZmZpY2UucGFrYmV0dHYuZ2doc29mdHdhcmVkZXYuY29tIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1746044589),
('s7yoFB4y7y8T9qGtX0hSoPO3RN3OqjcuXdjx9wFv', NULL, '2a02:4780:6:c0de::10', 'Go-http-client/2.0', 'YToyOntzOjY6Il90b2tlbiI7czo0MDoiOVl5R25ob3F6ZXhobk9TeFkxbzFLV0RaOEFGcjJ2SmkxY242TVdROSI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1746073294),
('sC91geK10X6CKvgxNPyhLqoKryALuOmnBeINXSuV', NULL, '2a02:4780:6:c0de::10', 'Go-http-client/2.0', 'YToyOntzOjY6Il90b2tlbiI7czo0MDoiR09CNG5vVkFMOHJ6ZHE5NzZGa1JVRjloQVRaYUpPZWFVRlFTT29qaCI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1745997712),
('xdUw5jqlce8JgMyhx2YA5QV1ILiAoCf1Nufd15OM', NULL, '23.27.145.109', 'Mozilla/5.0 (X11; Linux i686; rv:109.0) Gecko/20100101 Firefox/120.0', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiWEdZdjNqTEpVWWJieW9JZVB4eVFaUnZQZUhpY0RSaGZXdW9MakJpdiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6NDc6Imh0dHBzOi8vYmFjay1vZmZpY2UucGFrYmV0dHYuZ2doc29mdHdhcmVkZXYuY29tIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1745994297);

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
-- Table structure for table `system_users`
--

CREATE TABLE `system_users` (
  `ID` int(11) NOT NULL,
  `username` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `fullname` varchar(255) DEFAULT NULL,
  `groupid` varchar(255) DEFAULT NULL,
  `active` int(11) DEFAULT NULL,
  `ext_security_id` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Dumping data for table `system_users`
--

INSERT INTO `system_users` (`ID`, `username`, `password`, `email`, `fullname`, `groupid`, `active`, `ext_security_id`) VALUES
(1, 'admin', '@PakbettvGGH2025', '', '', NULL, 1, NULL);

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
  ADD KEY `cart_product_id_foreign` (`product_id`);

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
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

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
  ADD KEY `order_items_product_id_foreign` (`product_id`);

--
-- Indexes for table `pakbet_tv_uggroups`
--
ALTER TABLE `pakbet_tv_uggroups`
  ADD PRIMARY KEY (`GroupID`);

--
-- Indexes for table `pakbet_tv_ugmembers`
--
ALTER TABLE `pakbet_tv_ugmembers`
  ADD PRIMARY KEY (`UserName`(50),`GroupID`);

--
-- Indexes for table `pakbet_tv_ugrights`
--
ALTER TABLE `pakbet_tv_ugrights`
  ADD PRIMARY KEY (`TableName`(50),`GroupID`);

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
-- Indexes for table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`image_id`);

--
-- Indexes for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`variant_id`),
  ADD UNIQUE KEY `product_variants_sku_unique` (`sku`),
  ADD KEY `product_variants_product_id_foreign` (`product_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`);

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
-- Indexes for table `system_users`
--
ALTER TABLE `system_users`
  ADD PRIMARY KEY (`ID`);

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
  MODIFY `category_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `inventory_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=138;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `order_item_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `pakbet_tv_uggroups`
--
ALTER TABLE `pakbet_tv_uggroups`
  MODIFY `GroupID` int(11) NOT NULL AUTO_INCREMENT;

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
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `image_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `variant_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shipping`
--
ALTER TABLE `shipping`
  MODIFY `shipping_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_users`
--
ALTER TABLE `system_users`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
  ADD CONSTRAINT `cart_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

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
  ADD CONSTRAINT `order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
