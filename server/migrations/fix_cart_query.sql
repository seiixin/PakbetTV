-- Fix for the cart query reference issue
-- This migration provides a procedure that can be used
-- to safely retrieve cart items without the "Reference 'size' not supported" error

DELIMITER //

CREATE OR REPLACE PROCEDURE get_cart_items(IN userId INT)
BEGIN
    SELECT 
        c.cart_id, 
        c.user_id, 
        c.product_id, 
        c.variant_id, 
        c.quantity, 
        c.created_at, 
        c.updated_at,
        p.name AS product_name, 
        p.product_code, 
        p.description,
        v.price,
        v.stock,
        v.image_url,
        JSON_UNQUOTE(JSON_EXTRACT(v.attributes, '$.Size')) AS size,
        JSON_UNQUOTE(JSON_EXTRACT(v.attributes, '$.Color')) AS color,
        v.sku
    FROM cart c
    JOIN products p ON c.product_id = p.product_id
    LEFT JOIN (
        SELECT 
            variant_id, 
            product_id, 
            price, 
            stock, 
            image_url, 
            attributes,
            sku
        FROM product_variants
    ) v ON (c.variant_id = v.variant_id OR (c.variant_id IS NULL AND v.product_id = c.product_id))
    WHERE c.user_id = userId;
END //

DELIMITER ; 