-- Add 'dragonpay' to payment_method enum in payments table
ALTER TABLE payments MODIFY payment_method ENUM('credit_card','paypal','bank_transfer','cod','dragonpay') NOT NULL; 