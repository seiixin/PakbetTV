-- Add the missing foreign key constraint for order_id
-- This fixes the "Unknown column 'order_id' in 'WHERE'" error

-- First, check if the constraint already exists (safety check)
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'shipping' 
    AND CONSTRAINT_NAME = 'shipping_order_id_foreign'
);

-- Add the constraint only if it doesn't exist
SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE shipping ADD CONSTRAINT shipping_order_id_foreign FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE',
    'SELECT "Foreign key constraint already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the constraint was added
SELECT 
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'shipping' 
AND REFERENCED_TABLE_NAME IS NOT NULL;