CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `txn_id` VARCHAR(255) NOT NULL,
  `ref_no` VARCHAR(255),
  `status` VARCHAR(50) NOT NULL,
  `message` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Status codes from Dragonpay:
-- S = Success
-- F = Failed
-- P = Pending
-- U = Unknown
-- R = Refund
-- K = Chargeback
-- V = Void 