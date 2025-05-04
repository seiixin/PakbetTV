-- Make sure the orders table has awaiting_for_confirmation in payment_status enum
-- This prevents errors when confirming payments

-- Check if awaiting_for_confirmation is in the enum
SET @query = CONCAT(
    "SELECT COUNT(*) INTO @enum_exists FROM information_schema.COLUMNS ",
    "WHERE TABLE_SCHEMA = DATABASE() ",
    "AND TABLE_NAME = 'orders' ",
    "AND COLUMN_NAME = 'payment_status' ",
    "AND COLUMN_TYPE LIKE '%awaiting_for_confirmation%'"
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add awaiting_for_confirmation if it doesn't exist
SET @alter_query = IF(@enum_exists = 0,
    "ALTER TABLE orders MODIFY payment_status ENUM('pending','paid','failed','refunded','awaiting_for_confirmation') NOT NULL DEFAULT 'pending'",
    "SELECT 'awaiting_for_confirmation already exists in orders.payment_status' AS message"
);

PREPARE stmt FROM @alter_query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if waiting_for_confirmation is in the enum
SET @query = CONCAT(
    "SELECT COUNT(*) INTO @enum_exists FROM information_schema.COLUMNS ",
    "WHERE TABLE_SCHEMA = DATABASE() ",
    "AND TABLE_NAME = 'payments' ",
    "AND COLUMN_NAME = 'status' ",
    "AND COLUMN_TYPE LIKE '%waiting_for_confirmation%'"
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add waiting_for_confirmation if it doesn't exist
SET @alter_query = IF(@enum_exists = 0,
    "ALTER TABLE payments MODIFY status ENUM('pending','completed','failed','refunded','waiting_for_confirmation') NOT NULL DEFAULT 'pending'",
    "SELECT 'waiting_for_confirmation already exists in payments.status' AS message"
);

PREPARE stmt FROM @alter_query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make sure dragonpay is in the payment_method enum
SET @query = CONCAT(
    "SELECT COUNT(*) INTO @enum_exists FROM information_schema.COLUMNS ",
    "WHERE TABLE_SCHEMA = DATABASE() ",
    "AND TABLE_NAME = 'payments' ",
    "AND COLUMN_NAME = 'payment_method' ",
    "AND COLUMN_TYPE LIKE '%dragonpay%'"
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add dragonpay if it doesn't exist
SET @alter_query = IF(@enum_exists = 0,
    "ALTER TABLE payments MODIFY payment_method ENUM('credit_card','paypal','bank_transfer','cod','dragonpay') NOT NULL",
    "SELECT 'dragonpay already exists in payments.payment_method' AS message"
);

PREPARE stmt FROM @alter_query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt; 