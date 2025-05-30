-- Fix for orders table auto-increment issue
-- Date: 2024
-- Issue: Failed to read auto-increment value from storage engine
-- Solution: Reset auto-increment to proper value

-- Check current status before fix
-- SHOW TABLE STATUS LIKE 'orders';

-- Reset auto-increment to start from 1 (safe since table was empty)
ALTER TABLE orders AUTO_INCREMENT = 1;

-- Verify the fix
SHOW TABLE STATUS LIKE 'orders'; 