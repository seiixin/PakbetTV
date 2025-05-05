-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 04, 2025 at 03:12 PM
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

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `migrate_shipping_addresses` ()   BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE order_id_val BIGINT;
    DECLARE address_val TEXT;
    DECLARE cur CURSOR FOR 
        SELECT order_id, address FROM shipping 
        WHERE order_id NOT IN (SELECT order_id FROM shipping_details);
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO order_id_val, address_val;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Extract postcode
        SET @postcode = NULL;
        SET @postcode_match = REGEXP_SUBSTR(address_val, '[0-9]{5,6}');
        IF @postcode_match IS NOT NULL THEN
            SET @postcode = @postcode_match;
        END IF;
        
        -- Split address by commas
        SET @address_parts = address_val;
        SET @address1 = SUBSTRING_INDEX(@address_parts, ',', 1);
        SET @address_parts = TRIM(SUBSTRING(@address_parts, LENGTH(@address1) + 2));
        
        SET @city = NULL;
        SET @state = NULL;
        
        -- If we have more address parts
        IF LENGTH(@address_parts) > 0 THEN
            -- Last part is likely state
            SET @state = TRIM(SUBSTRING_INDEX(@address_parts, ',', -1));
            SET @address_parts = TRIM(SUBSTRING(@address_parts, 1, LENGTH(@address_parts) - LENGTH(@state) - 1));
            
            -- Second last part is likely city
            IF LENGTH(@address_parts) > 0 THEN
                SET @city = TRIM(SUBSTRING_INDEX(@address_parts, ',', -1));
                SET @address_parts = TRIM(SUBSTRING(@address_parts, 1, LENGTH(@address_parts) - LENGTH(@city) - 1));
            END IF;
        END IF;
        
        -- Insert into shipping_details
        INSERT INTO shipping_details (
            order_id, address1, city, state, postcode, country
        ) VALUES (
            order_id_val, 
            @address1, 
            @city, 
            @state, 
            @postcode,
            'MY'
        );
    END LOOP;
    
    CLOSE cur;
END$$

DELIMITER ;

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
  `quantity` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cart`
--

INSERT INTO `cart` (`cart_id`, `user_id`, `product_id`, `variant_id`, `quantity`, `created_at`, `updated_at`) VALUES
(1, 13, 86, NULL, 1, NULL, NULL);

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
(12, 'amulets', NULL, NULL, NULL, NULL),
(13, 'books', NULL, NULL, NULL, NULL),
(14, 'necklace', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `inventory_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `variant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `change_type` enum('add','remove') NOT NULL,
  `quantity` int(11) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `name`, `applied_at`) VALUES
(1, 'add_awaiting_confirmation.sql', '2025-05-04 02:41:29'),
(2, 'fix_payment_status.sql', '2025-05-04 08:15:55'),
(3, 'update_payment_method_enum.sql', '2025-05-04 08:16:05');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `order_status` enum('pending_payment','processing','for_packing','packed','for_shipping','picked_up','delivered','completed','returned','cancelled') NOT NULL DEFAULT 'pending_payment',
  `payment_status` enum('pending','paid','failed','refunded','awaiting_for_confirmation') NOT NULL DEFAULT 'pending',
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
(145, 13, 500.00, 'for_packing', 'paid', '2025-05-03 12:40:34', '2025-05-03 12:40:52'),
(146, 13, 250.00, 'for_packing', 'paid', '2025-05-03 11:57:26', '2025-05-03 11:57:58'),
(147, 13, 250.00, 'processing', 'awaiting_for_confirmation', '2025-05-03 11:50:56', '2025-05-03 11:50:56'),
(148, 13, 250.00, 'processing', 'awaiting_for_confirmation', '2025-05-03 11:46:07', '2025-05-03 11:46:07'),
(149, 13, 250.00, 'processing', 'awaiting_for_confirmation', '2025-05-03 11:42:19', '2025-05-03 11:42:19'),
(150, 13, 250.00, 'processing', 'paid', '2025-05-03 11:41:32', '2025-05-03 11:41:32'),
(151, 13, 250.00, 'for_packing', 'pending', NULL, NULL),
(152, 13, 250.00, 'for_packing', 'paid', NULL, NULL),
(153, 13, 250.00, 'for_packing', 'paid', NULL, '2025-04-20 02:27:17'),
(154, 13, 250.00, '', 'paid', NULL, '2025-04-20 02:32:39'),
(155, 13, 250.00, '', 'paid', NULL, '2025-04-20 02:43:27'),
(156, 13, 250.00, 'for_packing', 'paid', NULL, '2025-04-20 02:47:38'),
(157, 13, 1298.00, 'processing', 'paid', '2025-05-03 11:40:15', '2025-05-03 11:40:15'),
(158, 13, 599.00, 'for_packing', 'paid', '2025-05-03 11:39:31', '2025-05-03 11:39:54'),
(166, 13, 599.00, 'for_packing', 'paid', NULL, '2025-05-04 12:48:45');

-- --------------------------------------------------------

--
-- Table structure for table `order_confirmations`
--

CREATE TABLE `order_confirmations` (
  `confirmation_id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `deadline` datetime NOT NULL,
  `status` enum('pending','receive','return','auto_completed') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `order_item_id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `variant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `variant_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`variant_data`)),
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `size` varchar(50) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `sku` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`order_item_id`, `order_id`, `product_id`, `variant_id`, `variant_data`, `quantity`, `price`, `size`, `color`, `sku`, `created_at`, `updated_at`) VALUES
(27, 143, 71, NULL, NULL, 2, 250.00, NULL, NULL, NULL, NULL, NULL),
(28, 144, 71, NULL, NULL, 2, 250.00, NULL, NULL, NULL, NULL, NULL),
(29, 145, 71, NULL, NULL, 2, 250.00, NULL, NULL, NULL, NULL, NULL),
(30, 146, 71, NULL, NULL, 1, 250.00, NULL, NULL, NULL, NULL, NULL),
(31, 147, 71, NULL, NULL, 1, 250.00, NULL, NULL, NULL, NULL, NULL),
(32, 148, 71, NULL, NULL, 1, 250.00, NULL, NULL, NULL, NULL, NULL),
(33, 149, 71, NULL, NULL, 1, 250.00, NULL, NULL, NULL, NULL, NULL),
(34, 150, 71, NULL, NULL, 1, 250.00, NULL, NULL, NULL, NULL, NULL),
(35, 151, 71, NULL, NULL, 1, 250.00, NULL, NULL, NULL, NULL, NULL),
(36, 152, 71, NULL, NULL, 1, 250.00, NULL, NULL, NULL, NULL, NULL),
(37, 153, 71, NULL, NULL, 1, 250.00, NULL, NULL, NULL, NULL, NULL),
(38, 154, 71, NULL, NULL, 1, 250.00, NULL, NULL, NULL, NULL, NULL),
(39, 155, 71, NULL, NULL, 1, 250.00, NULL, NULL, NULL, NULL, NULL),
(40, 156, 71, NULL, NULL, 1, 250.00, NULL, NULL, NULL, NULL, NULL),
(41, 157, 86, 53, '{\"Material\":\"Emerald\"}', 1, 699.00, NULL, NULL, NULL, NULL, NULL),
(42, 157, 86, 52, '{\"Material\":\"Jade\"}', 1, 599.00, NULL, NULL, NULL, NULL, NULL),
(43, 158, 86, 52, '{\"Material\":\"Jade\"}', 1, 599.00, NULL, NULL, NULL, NULL, NULL),
(51, 166, 86, 52, '{\"Material\":\"Jade\"}', 1, 599.00, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('dragonpay') NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `status` enum('pending','completed','failed','refunded','waiting_for_confirmation') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`payment_id`, `order_id`, `user_id`, `amount`, `payment_method`, `reference_number`, `status`, `created_at`, `updated_at`) VALUES
(1, 139, 5, 100.00, '', NULL, 'pending', NULL, NULL),
(2, 139, 5, 100.00, '', NULL, 'pending', NULL, NULL),
(3, 139, 5, 100.00, '', NULL, 'pending', NULL, NULL),
(4, 139, 5, 100.00, '', NULL, 'pending', NULL, NULL),
(5, 139, 5, 100.00, '', NULL, 'pending', NULL, NULL),
(6, 139, 5, 100.00, '', NULL, 'pending', NULL, NULL),
(7, 139, 5, 100.00, '', NULL, 'pending', NULL, NULL),
(8, 139, 5, 100.00, '', NULL, 'pending', NULL, NULL),
(9, 139, 5, 100.00, '', NULL, 'pending', NULL, NULL),
(10, 139, 5, 100.00, '', NULL, 'pending', NULL, NULL),
(11, 139, 5, 100.00, '', NULL, 'pending', NULL, NULL),
(12, 139, 5, 100.00, '', NULL, 'pending', NULL, NULL),
(13, 140, 5, 100.00, '', NULL, 'pending', NULL, NULL),
(14, 141, 5, 100.00, '', NULL, 'pending', NULL, NULL),
(15, 143, 13, 500.00, 'dragonpay', 'order_143_1745084619426', 'pending', NULL, NULL),
(16, 144, 13, 500.00, 'dragonpay', 'order_144_1745084874876', 'pending', NULL, NULL),
(17, 145, 13, 500.00, 'dragonpay', 'order_145_1745085082976', 'completed', '2025-05-03 12:40:34', '2025-05-03 12:40:52'),
(18, 146, 13, 250.00, 'dragonpay', 'order_146_1745085220702', 'completed', '2025-05-03 11:57:26', '2025-05-03 11:57:58'),
(19, 147, 13, 250.00, 'dragonpay', 'order_147_1745085389331', 'waiting_for_confirmation', '2025-05-03 11:50:56', '2025-05-03 11:50:56'),
(20, 148, 13, 250.00, 'dragonpay', 'order_148_1745085485219', 'pending', '2025-05-03 11:46:07', '2025-05-03 11:46:07'),
(21, 149, 13, 250.00, 'dragonpay', 'order_149_1745112744859', 'pending', '2025-05-03 11:42:19', '2025-05-03 11:42:19'),
(22, 150, 13, 250.00, 'dragonpay', 'order_150_1745114335469', 'pending', '2025-05-03 11:41:32', '2025-05-03 11:41:32'),
(23, 151, 13, 250.00, 'dragonpay', 'order_151_1745115396228', 'pending', NULL, '2025-05-03 10:42:18'),
(24, 152, 13, 250.00, 'dragonpay', 'order_152_1745115754799', 'pending', NULL, '2025-05-03 10:28:40'),
(25, 153, 13, 250.00, 'dragonpay', 'CGYXWCWT31', 'pending', NULL, '2025-04-20 02:27:17'),
(26, 154, 13, 250.00, 'dragonpay', 'UQ4RY4FKG7', 'pending', NULL, '2025-04-20 02:32:39'),
(27, 155, 13, 250.00, 'dragonpay', 'WBATWDJG44', 'pending', NULL, '2025-04-20 02:43:27'),
(28, 156, 13, 250.00, 'dragonpay', 'ECYQVHXFY1', 'pending', NULL, '2025-04-20 02:47:38'),
(29, 157, 13, 1298.00, 'dragonpay', 'order_157_1746270892135', 'pending', '2025-05-03 11:40:15', '2025-05-03 11:40:15'),
(30, 157, 13, 1298.00, 'dragonpay', 'order_157_1746271183897', 'pending', '2025-05-03 11:40:15', '2025-05-03 11:40:15'),
(31, 158, 13, 599.00, 'dragonpay', 'order_158_1746272280376', 'pending', '2025-05-03 11:39:31', '2025-05-03 11:39:54'),
(32, 166, 13, 599.00, 'dragonpay', 'order_166_1746362323581', 'completed', NULL, '2025-05-04 12:48:45');

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
  `average_rating` decimal(3,2) DEFAULT NULL,
  `review_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `stock` int(11) NOT NULL DEFAULT 0,
  `is_featured` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `product_code`, `name`, `description`, `category_id`, `average_rating`, `review_count`, `created_at`, `updated_at`, `price`, `stock`, `is_featured`) VALUES
(71, 'AMU001', 'Amulet', 'This Feng Shui-inspired affirmation blends ancient wisdom with everyday practices to invite balance, positivity, and good fortune. Each line offers a simple tip or reminder to align your space—and your energy—with abundance and harmony. Perfect for daily inspiration or sharing good vibes with others.\r\n\r\n', 12, 5.00, 1, '2025-04-19 16:51:18', '2025-04-20 02:54:44', 250.00, 7, 0),
(72, 'NEC001', 'Necklace ', 'Latest and greatest feng shui necklace brought you by Feng Shui ', 14, NULL, 0, '2025-04-20 03:12:25', '2025-04-20 03:12:25', 1000.00, 50, 0),
(86, 'AMU-001', 'Feng Shui Braceletssssssssss', 'The best feng shui bracelets', 12, NULL, 0, '2025-04-20 14:35:23', '2025-04-20 15:13:27', 0.00, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `product_images`
--

CREATE TABLE `product_images` (
  `image_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `sort_order` int(10) UNSIGNED DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_images`
--

INSERT INTO `product_images` (`image_id`, `product_id`, `image_url`, `alt_text`, `sort_order`, `created_at`) VALUES
(5, 71, 'products/product-1745081478249-977708204.jpg', 'Amulet1.jpg', 0, '2025-04-19 16:51:18'),
(6, 71, 'products/product-1745081478250-99290799.jpg', 'Amulet2.jpg', 1, '2025-04-19 16:51:18'),
(7, 72, 'products/product-1745118745905-885929891.jpg', 'JadeBracelet.jpg', 0, '2025-04-20 03:12:25'),
(8, 72, 'products/product-1745118745906-273200813.jpg', 'LuckBracelet.jpg', 1, '2025-04-20 03:12:25'),
(9, 72, 'products/product-1745118745906-485668165.jpg', 'luckbracelet2.jpg', 2, '2025-04-20 03:12:25'),
(11, 86, 'uploads/products/product-1745159723964-871436932.jpg', NULL, 0, '2025-04-20 14:35:23');

-- --------------------------------------------------------

--
-- Table structure for table `product_variants`
--

CREATE TABLE `product_variants` (
  `variant_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `sku` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `image_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Dynamic variant attributes (e.g., {"Size": "M", "Color": "Red"})' CHECK (json_valid(`attributes`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_variants`
--

INSERT INTO `product_variants` (`variant_id`, `product_id`, `sku`, `price`, `stock`, `image_url`, `created_at`, `updated_at`, `attributes`) VALUES
(24, 60, 'bbbbbaas1121', 1.00, 200, 'variants/jKKBpH6ZlO258AVrYaM1B4wPn8phY5UGHxeOfM6s.png', '2025-04-01 07:48:08', '2025-04-01 07:48:08', NULL),
(25, 61, '111', 1.00, 1111, 'variants/0yak7Yka0iWFi6tsFMofJw31CC1ZBsCXGSXGIhkv.png', '2025-04-01 08:31:14', '2025-04-01 08:31:14', NULL),
(26, 62, '121u2y1', 12.00, 12, 'variants/mrU2WoJOpH6WGSbNswMlt5b7D8aEavVUDggB5ZUR.png', '2025-04-05 04:45:35', '2025-04-05 04:45:35', NULL),
(27, 73, 'P13001-1', 99.00, 98, 'uploads/variants/1745126109951-272673867.jpg', '2025-04-20 05:15:09', '2025-04-20 05:15:10', NULL),
(28, 73, 'P13001-2', 199.00, 200, 'uploads/variants/1745126109956-466181030.jpg', '2025-04-20 05:15:10', '2025-04-20 05:15:10', NULL),
(29, 74, 'P13002-1', 99.00, 98, 'uploads/variants/1745126423838-178333962.jpg', '2025-04-20 05:20:23', '2025-04-20 05:20:23', NULL),
(30, 74, 'P13002-2', 199.00, 200, 'uploads/variants/1745126423842-317971393.jpg', '2025-04-20 05:20:23', '2025-04-20 05:20:23', NULL),
(31, 75, 'P13003-1', 99.00, 98, 'uploads/variants/1745126608146-718333861.jpg', '2025-04-20 05:23:28', '2025-04-20 05:23:28', NULL),
(32, 75, 'P13003-2', 199.00, 200, 'uploads/variants/1745126608151-156318806.jpg', '2025-04-20 05:23:28', '2025-04-20 05:23:28', NULL),
(34, 77, 'BOO001-1-1745128950125-eaks', 100.00, 100, 'uploads/variants/1745128950136-582171505.jpg', '2025-04-20 06:02:30', '2025-04-20 06:02:30', NULL),
(35, 77, 'BOO001-2-1745128950125-eaks', 200.00, 100, 'uploads/variants/1745128950138-983949119.jpg', '2025-04-20 06:02:30', '2025-04-20 06:02:30', NULL),
(36, 78, 'BOO001-1-1745129150463-vgkc', 100.00, 100, 'uploads/variants/1745129150476-650928710.jpg', '2025-04-20 06:05:50', '2025-04-20 06:05:50', NULL),
(37, 78, 'BOO001-2-1745129150463-vgkc', 200.00, 100, 'uploads/variants/1745129150478-594786617.png', '2025-04-20 06:05:50', '2025-04-20 06:05:50', NULL),
(38, 79, 'BOO001-1-1745129910382-sws4', 100.00, 100, 'uploads/variants/1745129910391-328897168.jpg', '2025-04-20 06:18:30', '2025-04-20 06:18:30', NULL),
(39, 79, 'BOO001-2-1745129910382-sws4', 200.00, 100, 'uploads/variants/1745129910394-418291170.png', '2025-04-20 06:18:30', '2025-04-20 06:18:30', NULL),
(40, 80, 'BOO001-1-1745133295273-rxpc', 100.00, 100, 'uploads/variants/variant-1745133295292-932438931.jpg', '2025-04-20 07:14:55', '2025-04-20 07:14:55', NULL),
(41, 80, 'BOO001-2-1745133295273-rxpc', 200.00, 100, 'uploads/variants/variant-1745133295296-825788505.jpg', '2025-04-20 07:14:55', '2025-04-20 07:14:55', NULL),
(42, 81, 'BOO001-1-1745133746981-6yjw', 100.00, 100, 'uploads/variants/variant-1745133746998-762050160.jpg', '2025-04-20 07:22:27', '2025-04-20 07:22:27', NULL),
(43, 81, 'BOO001-2-1745133746981-6yjw', 200.00, 100, 'uploads/variants/variant-1745133746998-924357658.jpg', '2025-04-20 07:22:27', '2025-04-20 07:22:27', NULL),
(44, 82, 'BOO001-1-1745134799741-i3nz', 100.00, 100, 'uploads/variants/variant-1745134799751-402242099.jpg', '2025-04-20 07:39:59', '2025-04-20 07:39:59', NULL),
(45, 82, 'BOO001-2-1745134799741-i3nz', 200.00, 100, 'uploads/variants/variant-1745134799751-309204551.jpg', '2025-04-20 07:39:59', '2025-04-20 07:39:59', NULL),
(46, 83, 'AMU002-1-fvy8', 599.00, 10, 'uploads/variants/variant-1745158114275-910083515.jpg', '2025-04-20 14:08:34', '2025-04-20 14:08:34', '{\"Material\":\"Emerald\"}'),
(47, 83, 'AMU002-2-fvy8', 699.00, 10, 'uploads/variants/variant-1745158114276-280826954.jpg', '2025-04-20 14:08:34', '2025-04-20 14:08:34', '{\"Material\":\"Jade\"}'),
(48, 84, 'AMU-001-1-njje', 599.00, 10, NULL, '2025-04-20 14:09:00', '2025-04-20 14:09:00', '{\"Material\":\"Emerald\"}'),
(49, 84, 'AMU-001-2-njje', 699.00, 10, NULL, '2025-04-20 14:09:00', '2025-04-20 14:09:00', '{\"Material\":\"Jade\"}'),
(50, 85, 'AMU002-1-bz71', 599.00, 10, 'uploads/variants/variant-1745159632858-406883527.jpg', '2025-04-20 14:33:52', '2025-04-20 14:33:52', '{\"Material\":\"Jade\"}'),
(51, 85, 'AMU002-2-bz71', 699.00, 10, 'uploads/variants/variant-1745159632859-398377455.jpg', '2025-04-20 14:33:52', '2025-04-20 14:33:52', '{\"Material\":\"Emerald\"}'),
(52, 86, 'AMU002-1-q7mh', 599.00, 7, 'uploads/variants/variant-1745159723964-558554674.jpg', '2025-04-20 14:35:23', '2025-05-04 12:38:43', '{\"Material\":\"Jade\"}'),
(53, 86, 'AMU002-2-q7mh', 699.00, 9, 'uploads/variants/variant-1745159723964-180071056.jpg', '2025-04-20 14:35:23', '2025-05-03 11:14:52', '{\"Material\":\"Emerald\"}'),
(54, 86, 'AMU-001-1-43qv', 599.00, 10, NULL, '2025-04-20 15:13:15', '2025-04-20 15:13:15', '{\"Material\":\"Jade\"}'),
(55, 86, 'AMU-001-2-43qv', 699.00, 10, NULL, '2025-04-20 15:13:15', '2025-04-20 15:13:15', '{\"Material\":\"Emerald\"}'),
(56, 86, 'AMU-001-1-x6ov', 599.00, 10, NULL, '2025-04-20 15:13:27', '2025-04-20 15:13:27', '{\"Material\":\"Jade\"}'),
(57, 86, 'AMU-001-2-x6ov', 699.00, 10, NULL, '2025-04-20 15:13:27', '2025-04-20 15:13:27', '{\"Material\":\"Emerald\"}'),
(58, 86, 'AMU-001-3-x6ov', 599.00, 10, NULL, '2025-04-20 15:13:27', '2025-04-20 15:13:27', '{\"Material\":\"Jade\"}'),
(59, 86, 'AMU-001-4-x6ov', 699.00, 10, NULL, '2025-04-20 15:13:27', '2025-04-20 15:13:27', '{\"Material\":\"Emerald\"}');

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `review_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `rating` tinyint(3) UNSIGNED NOT NULL COMMENT 'Rating from 1 to 5',
  `review_text` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reviews`
--

INSERT INTO `reviews` (`review_id`, `product_id`, `user_id`, `rating`, `review_text`, `created_at`, `updated_at`) VALUES
(1, 71, 13, 5, 'Very Good product, Recommended to buy!', '2025-04-20 02:54:44', '2025-04-20 02:58:29');

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
  `carrier` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Triggers `shipping`
--
DELIMITER $$
CREATE TRIGGER `after_shipping_insert` AFTER INSERT ON `shipping` FOR EACH ROW BEGIN
    -- If address is in generic format and no shipping_details entry exists yet
    IF NOT EXISTS (SELECT 1 FROM shipping_details WHERE order_id = NEW.order_id) THEN
        -- Extract postcode
        SET @postcode = NULL;
        SET @postcode_match = REGEXP_SUBSTR(NEW.address, '[0-9]{5,6}');
        IF @postcode_match IS NOT NULL THEN
            SET @postcode = @postcode_match;
        END IF;
        
        -- Split address by commas
        SET @address_parts = NEW.address;
        SET @address1 = SUBSTRING_INDEX(@address_parts, ',', 1);
        SET @address_parts = TRIM(SUBSTRING(@address_parts, LENGTH(@address1) + 2));
        
        SET @city = NULL;
        SET @state = NULL;
        
        -- If we have more address parts
        IF LENGTH(@address_parts) > 0 THEN
            -- Last part is likely state
            SET @state = TRIM(SUBSTRING_INDEX(@address_parts, ',', -1));
            SET @address_parts = TRIM(SUBSTRING(@address_parts, 1, LENGTH(@address_parts) - LENGTH(@state) - 1));
            
            -- Second last part is likely city
            IF LENGTH(@address_parts) > 0 THEN
                SET @city = TRIM(SUBSTRING_INDEX(@address_parts, ',', -1));
            END IF;
        END IF;
        
        -- Insert into shipping_details
        INSERT INTO shipping_details (
            order_id, address1, city, state, postcode, country
        ) VALUES (
            NEW.order_id, 
            @address1, 
            @city, 
            @state, 
            @postcode,
            'MY'
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `shipping_details`
--

CREATE TABLE `shipping_details` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `address1` varchar(255) NOT NULL,
  `address2` varchar(255) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `postcode` varchar(20) DEFAULT NULL,
  `country` varchar(2) DEFAULT 'MY',
  `address_type` varchar(20) DEFAULT 'home',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `region` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `city_municipality` varchar(100) DEFAULT NULL,
  `barangay` varchar(100) DEFAULT NULL,
  `street_name` varchar(255) DEFAULT NULL,
  `building` varchar(255) DEFAULT NULL,
  `house_number` varchar(50) DEFAULT NULL,
  `address_format` varchar(20) DEFAULT 'standard'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tracking_events`
--

CREATE TABLE `tracking_events` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tracking_number` varchar(100) NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `status` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
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
(12, 'Joshua', 'Joshua', 'Pilar', 'joshualancep128@gmail.com', '$2y$12$lCBB7r6KaYBY534wD5k60.35ge8zhtCrZcUQso4NYjWHyOVTUkOna', '09762140552', 'Test Street', 'admin', 'Active', '2025-04-05 05:06:00', '2025-04-05 05:06:00'),
(13, 'Felix', 'CaptainGuren', 'Juaton', 'felixjuaton87@gmail.com', '$2a$10$Ry8owgPhOCUH7PTBlYRHI.S2MnmgTEMd38hXp26.xm98uu0Ul9kdq', NULL, NULL, 'customer', 'Active', '2025-04-19 02:00:42', '2025-04-19 02:00:42'),
(14, 'Admin', 'Felix', 'Juaton', 'felix@gmail.com.com', '$2a$10$hyqmoVvHkE7hFj7R5IZ16.dXpi8snkh9ERelIfxqOhOIVxphZVokW', NULL, NULL, 'customer', 'Active', '2025-05-03 07:34:10', '2025-05-03 07:34:10');

-- --------------------------------------------------------

--
-- Table structure for table `user_shipping_details`
--

CREATE TABLE `user_shipping_details` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `address1` varchar(255) NOT NULL,
  `address2` varchar(255) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `postcode` varchar(20) DEFAULT NULL,
  `country` varchar(2) DEFAULT 'MY',
  `address_type` varchar(20) DEFAULT 'home',
  `is_default` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `region` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `city_municipality` varchar(100) DEFAULT NULL,
  `barangay` varchar(100) DEFAULT NULL,
  `street_name` varchar(255) DEFAULT NULL,
  `building` varchar(255) DEFAULT NULL,
  `house_number` varchar(50) DEFAULT NULL,
  `address_format` varchar(20) DEFAULT 'standard'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_shipping_details`
--

INSERT INTO `user_shipping_details` (`id`, `user_id`, `address1`, `address2`, `area`, `city`, `state`, `postcode`, `country`, `address_type`, `is_default`, `created_at`, `updated_at`, `region`, `province`, `city_municipality`, `barangay`, `street_name`, `building`, `house_number`, `address_format`) VALUES
(1, 13, 'Lot. Blk.9 Phase 1', '', NULL, NULL, NULL, '7000', 'MY', 'home', 1, '2025-05-04 02:50:42', '2025-05-04 02:50:42', 'Region IX', 'Zamboanga del Sur', 'Zamboanga City', 'Punta Dulo', NULL, NULL, NULL, 'standard');

--
-- Triggers `user_shipping_details`
--
DELIMITER $$
CREATE TRIGGER `before_user_shipping_details_insert` BEFORE INSERT ON `user_shipping_details` FOR EACH ROW BEGIN
    IF NEW.country = 'PH' THEN
        SET NEW.address_format = 'philippines';
        -- Combine Philippine format into address1 for NinjaVan compatibility
        SET NEW.address1 = CONCAT_WS(', ',
            NULLIF(NEW.house_number, ''),
            NULLIF(NEW.building, ''),
            NULLIF(NEW.street_name, ''),
            NULLIF(NEW.barangay, '')
        );
        SET NEW.address2 = CONCAT_WS(', ',
            NULLIF(NEW.city_municipality, ''),
            NULLIF(NEW.province, ''),
            NULLIF(NEW.region, '')
        );
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_user_shipping_details_update` BEFORE UPDATE ON `user_shipping_details` FOR EACH ROW BEGIN
    IF NEW.country = 'PH' THEN
        SET NEW.address_format = 'philippines';
        -- Combine Philippine format into address1 for NinjaVan compatibility
        SET NEW.address1 = CONCAT_WS(', ',
            NULLIF(NEW.house_number, ''),
            NULLIF(NEW.building, ''),
            NULLIF(NEW.street_name, ''),
            NULLIF(NEW.barangay, '')
        );
        SET NEW.address2 = CONCAT_WS(', ',
            NULLIF(NEW.city_municipality, ''),
            NULLIF(NEW.province, ''),
            NULLIF(NEW.region, '')
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `webhook_logs`
--

CREATE TABLE `webhook_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `provider` varchar(50) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  ADD KEY `inventory_variant_id_foreign` (`variant_id`),
  ADD KEY `inventory_product_id_idx` (`product_id`);

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
-- Indexes for table `order_confirmations`
--
ALTER TABLE `order_confirmations`
  ADD PRIMARY KEY (`confirmation_id`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `order_items_order_id_foreign` (`order_id`),
  ADD KEY `order_items_product_id_foreign` (`product_id`),
  ADD KEY `order_items_variant_id_foreign` (`variant_id`),
  ADD KEY `idx_order_id` (`order_id`),
  ADD KEY `idx_product_id` (`product_id`),
  ADD KEY `idx_variant_id` (`variant_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `idx_reference_number` (`reference_number`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD UNIQUE KEY `products_product_code_unique` (`product_code`),
  ADD KEY `products_category_id_foreign` (`category_id`),
  ADD KEY `product_stock_idx` (`product_id`,`stock`);

--
-- Indexes for table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`image_id`),
  ADD KEY `idx_product_image_product` (`product_id`);

--
-- Indexes for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`variant_id`),
  ADD UNIQUE KEY `product_variants_sku_unique` (`sku`),
  ADD KEY `product_variants_product_id_foreign` (`product_id`),
  ADD KEY `variant_stock_idx` (`variant_id`,`stock`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`review_id`),
  ADD KEY `idx_review_product` (`product_id`),
  ADD KEY `idx_review_user` (`user_id`);

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
-- Indexes for table `shipping_details`
--
ALTER TABLE `shipping_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `shipping_details_order_id_foreign` (`order_id`);

--
-- Indexes for table `tracking_events`
--
ALTER TABLE `tracking_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tracking_events_tracking_number_index` (`tracking_number`),
  ADD KEY `tracking_events_order_id_index` (`order_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_shipping_details`
--
ALTER TABLE `user_shipping_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_shipping_details_user_id_foreign` (`user_id`),
  ADD KEY `idx_user_shipping_user_id` (`user_id`),
  ADD KEY `idx_user_shipping_default` (`user_id`,`is_default`);

--
-- Indexes for table `webhook_logs`
--
ALTER TABLE `webhook_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `webhook_logs_provider_index` (`provider`),
  ADD KEY `webhook_logs_event_type_index` (`event_type`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cart`
--
ALTER TABLE `cart`
  MODIFY `cart_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=167;

--
-- AUTO_INCREMENT for table `order_confirmations`
--
ALTER TABLE `order_confirmations`
  MODIFY `confirmation_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `order_item_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=87;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `image_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `variant_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `review_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `shipping`
--
ALTER TABLE `shipping`
  MODIFY `shipping_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shipping_details`
--
ALTER TABLE `shipping_details`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tracking_events`
--
ALTER TABLE `tracking_events`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `user_shipping_details`
--
ALTER TABLE `user_shipping_details`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `webhook_logs`
--
ALTER TABLE `webhook_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

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
  ADD CONSTRAINT `inventory_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `inventory_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE CASCADE;

--
-- Constraints for table `order_confirmations`
--
ALTER TABLE `order_confirmations`
  ADD CONSTRAINT `order_confirmations_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  ADD CONSTRAINT `order_items_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE SET NULL;

--
-- Constraints for table `product_images`
--
ALTER TABLE `product_images`
  ADD CONSTRAINT `fk_product_image_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_review_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_review_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `shipping_details`
--
ALTER TABLE `shipping_details`
  ADD CONSTRAINT `shipping_details_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE;

--
-- Constraints for table `tracking_events`
--
ALTER TABLE `tracking_events`
  ADD CONSTRAINT `tracking_events_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE;

--
-- Constraints for table `user_shipping_details`
--
ALTER TABLE `user_shipping_details`
  ADD CONSTRAINT `user_shipping_details_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
