-- Add missing columns to shipping table
ALTER TABLE shipping
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL;

-- Add indexes for better performance
ALTER TABLE shipping ADD INDEX idx_phone (phone);
ALTER TABLE shipping ADD INDEX idx_email (email); 