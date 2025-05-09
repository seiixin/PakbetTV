-- Add items_sold column to products table
ALTER TABLE products ADD COLUMN items_sold INT DEFAULT 0;

-- Update existing items_sold based on completed orders
UPDATE products p
SET items_sold = (
    SELECT COALESCE(SUM(oi.quantity), 0)
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    WHERE oi.product_id = p.product_id
    AND o.order_status IN ('delivered', 'completed')
);

-- Create trigger to increment items_sold when order is completed
DELIMITER //

CREATE TRIGGER after_order_status_complete
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF NEW.order_status IN ('delivered', 'completed') AND OLD.order_status NOT IN ('delivered', 'completed') THEN
        UPDATE products p
        JOIN order_items oi ON p.product_id = oi.product_id
        SET p.items_sold = p.items_sold + oi.quantity
        WHERE oi.order_id = NEW.order_id;
    END IF;
END//

-- Create trigger to decrement items_sold when order is cancelled/refunded from completed state
CREATE TRIGGER after_order_status_revert
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF OLD.order_status IN ('delivered', 'completed') AND NEW.order_status IN ('cancelled', 'refunded') THEN
        UPDATE products p
        JOIN order_items oi ON p.product_id = oi.product_id
        SET p.items_sold = GREATEST(0, p.items_sold - oi.quantity)
        WHERE oi.order_id = NEW.order_id;
    END IF;
END//

DELIMITER ;

-- Add index for better performance
ALTER TABLE products ADD INDEX idx_items_sold (items_sold); 