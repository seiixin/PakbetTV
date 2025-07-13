-- Add image column to vouchers table
ALTER TABLE `vouchers` 
ADD COLUMN `image_url` varchar(500) DEFAULT NULL AFTER `description`,
ADD COLUMN `banner_image_url` varchar(500) DEFAULT NULL AFTER `image_url`; 