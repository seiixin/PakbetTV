CREATE TABLE IF NOT EXISTS horoscope_readings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sign VARCHAR(20) NOT NULL UNIQUE,      -- zodiac sign, e.g., 'rat', 'ox', etc.
  daily TEXT,
  weekly TEXT,
  monthly TEXT,
  is_updated BOOLEAN DEFAULT FALSE,      -- optional flag to trigger animation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
