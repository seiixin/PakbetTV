-- Migration: Convert existing vouchers to promotions
-- Run this before dropping the vouchers table

-- First, create the new promotions tables
-- (Assuming you've already created them)

-- Migrate existing voucher data to promotions
INSERT INTO promotions (
  promotion_name,
  promotion_type,
  discount_type,
  discount_value,
  target_type,
  target_id,
  start_date,
  end_date,
  description,
  is_active
)
SELECT 
  CONCAT('Product Discount - ', COALESCE(p.product_name, 'Unknown Product')) as promotion_name,
  'product_discount' as promotion_type,
  'percentage' as discount_type,
  v.discount_percentage as discount_value,
  CASE 
    WHEN v.product_id IS NOT NULL THEN 'product'
    ELSE 'all'
  END as target_type,
  v.product_id as target_id,
  v.start_date,
  v.end_date,
  CONCAT('Migrated from vouchers table - ', v.discount_percentage, '% discount') as description,
  CASE 
    WHEN v.end_date >= CURDATE() THEN TRUE
    ELSE FALSE
  END as is_active
FROM vouchers v
LEFT JOIN products p ON v.product_id = p.product_id
WHERE v.discount_percentage IS NOT NULL;

-- Verify migration
SELECT 
  'Vouchers migrated:' as info,
  COUNT(*) as count
FROM promotions 
WHERE description LIKE 'Migrated from vouchers table%';

-- After verifying the migration is successful, you can drop the vouchers table
-- DROP TABLE vouchers;
