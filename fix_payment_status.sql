-- This script fixes the payment_status in orders table based on payments table

-- First, update orders with empty order_status to 'pending'
UPDATE orders 
SET order_status = 'pending' 
WHERE order_status = '';

-- Next, update orders with status 'completed' in payments table
UPDATE orders o
INNER JOIN payments p ON o.order_id = p.order_id
SET o.payment_status = 'paid'
WHERE p.status = 'completed' AND o.payment_status = 'pending';

-- Update orders with status 'failed' in payments table
UPDATE orders o
INNER JOIN payments p ON o.order_id = p.order_id
SET o.payment_status = 'failed'
WHERE p.status = 'failed' AND o.payment_status = 'pending';

-- Update orders with status 'refunded' in payments table
UPDATE orders o
INNER JOIN payments p ON o.order_id = p.order_id
SET o.payment_status = 'refunded'
WHERE p.status = 'refunded' AND o.payment_status = 'pending';

-- Next, let's update the orders with status 'for_packing' but payment_status still 'pending'
UPDATE orders
SET payment_status = 'paid'
WHERE order_status = 'for_packing' AND payment_status = 'pending';

-- Create missing payment records for orders without them
INSERT INTO payments (order_id, user_id, amount, payment_method, status, created_at, updated_at)
SELECT o.order_id, o.user_id, o.total_price, 'manual', 
       CASE 
           WHEN o.payment_status = 'paid' THEN 'completed'
           WHEN o.payment_status = 'failed' THEN 'failed'
           WHEN o.payment_status = 'refunded' THEN 'refunded'
           ELSE 'pending'
       END,
       NOW(), NOW()
FROM orders o
LEFT JOIN payments p ON o.order_id = p.order_id
WHERE p.payment_id IS NULL;

-- Output the current status to verify changes
SELECT o.order_id, o.order_status, o.payment_status, p.status AS payment_table_status
FROM orders o
LEFT JOIN payments p ON o.order_id = p.order_id
ORDER BY o.order_id; 