-- Fix product_images table: Add AUTO_INCREMENT to image_id column
-- This will resolve the issue where all image_id values are 0

-- First, let's see the current state
SELECT 'Before fix - checking current image_id values:' as status;
SELECT image_id, product_id, COUNT(*) as count 
FROM product_images 
GROUP BY image_id, product_id 
ORDER BY image_id, product_id 
LIMIT 10;

-- Step 1: Drop existing data with image_id = 0 (since they're duplicates)
-- WARNING: This will remove duplicate image entries
DELETE FROM product_images WHERE image_id = 0;

-- Step 2: Modify the image_id column to add AUTO_INCREMENT
ALTER TABLE product_images 
MODIFY COLUMN image_id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

-- Step 3: Set the AUTO_INCREMENT starting value to 1
ALTER TABLE product_images AUTO_INCREMENT = 1;

-- Verify the fix
SELECT 'After fix - table structure:' as status;
SHOW CREATE TABLE product_images;

SELECT 'After fix - sample data:' as status;
SELECT image_id, product_id, alt_text, sort_order, created_at 
FROM product_images 
ORDER BY image_id 
LIMIT 10;