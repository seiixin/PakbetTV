-- Create the PISOSHIPPING promotion to replace the voucher
INSERT INTO promotions (
  promotion_code,
  promotion_name,
  promotion_type,
  shipping_override_amount,
  minimum_order_amount,
  usage_limit,
  usage_limit_per_user,
  start_date,
  end_date,
  is_active,
  description,
  terms_and_conditions
) VALUES (
  'PISOSHIPPING',
  '1 Peso Shipping Promo',
  'shipping_discount',
  1.00, -- Override shipping to ₱1
  500.00, -- Minimum order of ₱500
  1000, -- Can be used 1000 times total
  1, -- Each user can use it once
  '2024-01-01',
  '2025-12-31',
  TRUE,
  'Get shipping for only ₱1 on orders ₱500 and above',
  'Valid for orders with minimum amount of ₱500. Limited to one use per customer. Cannot be combined with other promotions.'
);

-- You can also create a free shipping promo
INSERT INTO promotions (
  promotion_code,
  promotion_name,
  promotion_type,
  free_shipping,
  minimum_order_amount,
  usage_limit_per_user,
  start_date,
  end_date,
  is_active,
  description
) VALUES (
  'FREESHIP1000',
  'Free Shipping on ₱1000+',
  'shipping_discount',
  TRUE,
  1000.00,
  1,
  '2024-01-01',
  '2025-12-31',
  TRUE,
  'Free shipping on orders ₱1000 and above'
);
