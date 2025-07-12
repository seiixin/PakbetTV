-- Fix stock column in products table
ALTER TABLE products MODIFY COLUMN stock INT NOT NULL DEFAULT 0;

-- Update any NULL stock values to 0
UPDATE products SET stock = 0 WHERE stock IS NULL;

-- Add check constraint to prevent negative stock
ALTER TABLE products ADD CONSTRAINT chk_stock_non_negative CHECK (stock >= 0);

-- Update stock for products with variants to be the sum of variant stock
UPDATE products p
SET p.stock = COALESCE(
  (SELECT SUM(stock) FROM product_variants WHERE product_id = p.product_id),
  p.stock
)
WHERE EXISTS (SELECT 1 FROM product_variants WHERE product_id = p.product_id); 