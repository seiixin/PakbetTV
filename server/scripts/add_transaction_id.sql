-- Add transaction_id column to payments table
ALTER TABLE payments
ADD COLUMN transaction_id VARCHAR(255) DEFAULT NULL AFTER payment_method;

-- Update existing records with a default transaction ID format
UPDATE payments
SET transaction_id = CONCAT('order_', order_id, '_', UNIX_TIMESTAMP(created_at))
WHERE transaction_id IS NULL;

-- Add an index on transaction_id for better query performance
CREATE INDEX idx_transaction_id ON payments(transaction_id);

-- Verify the changes
SELECT order_id, payment_method, transaction_id, status, created_at
FROM payments
ORDER BY created_at DESC
LIMIT 5; 