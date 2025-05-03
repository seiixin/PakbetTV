-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 03, 2025 at 12:31 PM
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
-- Database: `fengshui db`
--

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `order_status` enum('pending_payment','payment_confirmed','for_packing','packed','for_shipping','picked_up','delivered','completed','returned','cancelled') NOT NULL DEFAULT 'pending_payment',
  `payment_status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`order_id`, `user_id`, `total_price`, `order_status`, `payment_status`, `created_at`, `updated_at`) VALUES
(124, 5, 450.00, '', 'pending', '2025-03-26 05:15:37', '2025-04-05 05:41:01'),
(128, 9, 150.00, '', 'pending', '2025-03-26 05:15:37', '2025-04-09 00:33:12'),
(134, 8, 320.75, '', 'pending', '2025-03-26 05:15:37', '2025-03-25 22:00:27'),
(135, 10, 870.25, '', 'pending', '2025-03-26 05:15:37', '2025-04-09 00:33:19'),
(137, 5, 100.00, '', 'pending', NULL, NULL),
(139, 5, 100.00, '', 'pending', NULL, NULL),
(140, 5, 100.00, '', 'pending', NULL, NULL),
(141, 5, 100.00, '', 'pending', NULL, NULL),
(143, 13, 500.00, '', 'pending', NULL, NULL),
(144, 13, 500.00, '', 'pending', NULL, NULL),
(145, 13, 500.00, '', 'pending', NULL, NULL),
(146, 13, 250.00, '', 'pending', NULL, NULL),
(147, 13, 250.00, '', 'pending', NULL, NULL),
(148, 13, 250.00, '', 'pending', NULL, NULL),
(149, 13, 250.00, '', 'pending', NULL, NULL),
(150, 13, 250.00, '', 'pending', NULL, NULL),
(151, 13, 250.00, '', 'pending', NULL, NULL),
(152, 13, 250.00, 'for_packing', 'pending', NULL, NULL),
(153, 13, 250.00, 'for_packing', 'pending', NULL, '2025-04-20 02:27:17'),
(154, 13, 250.00, '', 'pending', NULL, '2025-04-20 02:32:39'),
(155, 13, 250.00, '', 'pending', NULL, '2025-04-20 02:43:27'),
(156, 13, 250.00, 'for_packing', 'pending', NULL, '2025-04-20 02:47:38');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `orders_user_id_foreign` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=157;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
