-- Add social media authentication columns to users table
ALTER TABLE users
ADD COLUMN google_id VARCHAR(255) NULL,
ADD COLUMN facebook_id VARCHAR(255) NULL,
ADD COLUMN profile_picture VARCHAR(255) NULL;

-- Add indexes for faster lookups
ALTER TABLE users
ADD INDEX idx_google_id (google_id),
ADD INDEX idx_facebook_id (facebook_id); 