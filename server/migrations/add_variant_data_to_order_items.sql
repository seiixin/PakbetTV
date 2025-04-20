-- Add variant_data column to order_items table to store dynamic attributes
ALTER TABLE order_items ADD COLUMN variant_data JSON DEFAULT NULL AFTER variant_id;

-- If the variant_id column doesn't exist, uncomment and run this line first
-- ALTER TABLE order_items ADD COLUMN variant_id INT DEFAULT NULL AFTER price;

-- Update existing order items with empty JSON object if they have size or color
UPDATE order_items oi
JOIN product_variants pv ON oi.variant_id = pv.variant_id
SET oi.variant_data = JSON_OBJECT('Size', pv.size, 'Color', pv.color)
WHERE oi.variant_id IS NOT NULL 
AND oi.variant_data IS NULL
AND (pv.size IS NOT NULL OR pv.color IS NOT NULL);

-- Add indexes for better performance
ALTER TABLE order_items ADD INDEX idx_order_id (order_id);
ALTER TABLE order_items ADD INDEX idx_product_id (product_id);
ALTER TABLE order_items ADD INDEX idx_variant_id (variant_id); 