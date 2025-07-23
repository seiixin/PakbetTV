-- Migration for Order Auto-Completion System (Simplified)
-- This handles the 3-day auto-completion for delivered orders using existing order table

-- Add new order statuses if they don't exist
ALTER TABLE orders MODIFY COLUMN order_status ENUM(
    'pending_payment',
    'processing', 
    'for_packing',
    'packed',
    'for_shipping',
    'picked_up',
    'shipped',
    'out_for_delivery',
    'delivered',
    'delivery_exception',
    'completed',
    'returned',
    'cancelled'
) NOT NULL DEFAULT 'pending_payment';

-- Enhance tracking_events table to store webhook data
ALTER TABLE tracking_events 
ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT 'In Transit',
ADD COLUMN IF NOT EXISTS event_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS webhook_data JSON NULL;

-- Add index for better webhook performance
ALTER TABLE tracking_events 
ADD INDEX IF NOT EXISTS idx_tracking_order_status (tracking_number, order_id, created_at);

-- Add index for auto-completion queries (find delivered orders older than 3 days)
ALTER TABLE orders 
ADD INDEX IF NOT EXISTS idx_order_status_updated (order_status, updated_at);

-- Create view for order tracking dashboard
CREATE OR REPLACE VIEW order_tracking_summary AS
SELECT 
    o.order_id,
    o.order_code,
    o.order_status,
    o.payment_status,
    o.total_price,
    o.created_at as order_date,
    o.updated_at as last_status_update,
    s.tracking_number,
    s.carrier,
    s.status as shipping_status,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    CASE 
        WHEN o.order_status = 'delivered' 
        THEN DATE_ADD(o.updated_at, INTERVAL 3 DAY)
        ELSE NULL 
    END as auto_completion_date,
    (SELECT COUNT(*) FROM tracking_events te WHERE te.order_id = o.order_id) as tracking_events_count,
    (SELECT te2.status FROM tracking_events te2 WHERE te2.order_id = o.order_id ORDER BY te2.created_at DESC LIMIT 1) as latest_tracking_status
FROM orders o
LEFT JOIN shipping s ON o.order_id = s.order_id
LEFT JOIN users u ON o.user_id = u.user_id
WHERE o.order_status NOT IN ('cancelled');

-- Insert some sample webhook URL configurations (you'll need to update these with your actual webhook URLs)
CREATE TABLE IF NOT EXISTS webhook_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    webhook_type VARCHAR(50) NOT NULL,
    webhook_url VARCHAR(500) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_webhook_type (webhook_type)
);

-- Insert the unified webhook URL that will handle all NinjaVan statuses
INSERT INTO webhook_configurations (webhook_type, webhook_url) VALUES 
('ninjavan_unified', 'https://yourdomain.com/api/webhooks/ninjavan/unified')
ON DUPLICATE KEY UPDATE 
webhook_url = VALUES(webhook_url),
updated_at = CURRENT_TIMESTAMP;