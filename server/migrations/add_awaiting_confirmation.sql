-- Add awaiting_for_confirmation to payment_status enum in orders table
ALTER TABLE orders 
MODIFY COLUMN payment_status ENUM('pending', 'paid', 'failed', 'refunded', 'awaiting_for_confirmation') NOT NULL DEFAULT 'pending';

-- Update any empty payment_status to pending
UPDATE orders 
SET payment_status = 'pending' 
WHERE payment_status = ''; 