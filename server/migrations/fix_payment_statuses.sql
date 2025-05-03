-- Fix payments table status enum
ALTER TABLE payments 
MODIFY COLUMN status ENUM('pending', 'completed', 'failed', 'refunded', 'waiting_for_confirmation') NOT NULL DEFAULT 'pending';

-- Fix orders table payment_status enum
ALTER TABLE orders 
MODIFY COLUMN payment_status ENUM('pending', 'paid', 'failed', 'refunded', 'awaiting_for_confirmation') NOT NULL DEFAULT 'pending';

-- Update any empty payment_status to pending
UPDATE orders 
SET payment_status = 'pending' 
WHERE payment_status = '';

-- Make sure all orders with processing status have the correct payment_status
UPDATE orders 
SET payment_status = 'awaiting_for_confirmation' 
WHERE order_status = 'processing' AND (payment_status = '' OR payment_status = 'pending'); 