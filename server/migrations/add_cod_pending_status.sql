-- Add cod_pending to payment_status enum in orders table
ALTER TABLE orders 
MODIFY COLUMN payment_status ENUM('pending', 'paid', 'failed', 'refunded', 'awaiting_for_confirmation', 'cod_pending') NOT NULL DEFAULT 'pending';

-- Add cod_pending to status enum in payments table
ALTER TABLE payments 
MODIFY COLUMN status ENUM('pending', 'completed', 'failed', 'refunded', 'waiting_for_confirmation', 'cod_pending') NOT NULL DEFAULT 'pending';

-- Update any existing COD orders to have the correct status
UPDATE orders o
JOIN payments p ON o.order_id = p.order_id
SET o.payment_status = 'cod_pending',
    p.status = 'cod_pending'
WHERE p.payment_method = 'cod' 
AND o.payment_status = 'pending'; 