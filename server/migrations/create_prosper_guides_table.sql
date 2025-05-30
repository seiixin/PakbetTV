-- Create prosper_guides table
CREATE TABLE IF NOT EXISTS `prosper_guides` (
  `guide_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `zodiacID` varchar(20) NOT NULL,
  `overview` text DEFAULT NULL,
  `career` text DEFAULT NULL,
  `health` text DEFAULT NULL,
  `love` text DEFAULT NULL,
  `wealth` text DEFAULT NULL,
  `status` enum('draft','published') NOT NULL DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`guide_id`),
  UNIQUE KEY `idx_zodiac_id` (`zodiacID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data for all zodiac signs
INSERT INTO `prosper_guides` (`zodiacID`, `overview`, `career`, `health`, `love`, `wealth`, `status`) VALUES
('Rat', 'The Rat is the first sign of the Chinese zodiac...', 'Career prospects are looking good...', 'Focus on maintaining a balanced diet...', 'Your charm will attract potential partners...', 'Good opportunities for wealth growth...', 'published'),
('Ox', 'The Ox is known for its diligence...', 'Your hard work will be recognized...', 'Take time to rest and recharge...', 'Stable relationships are favored...', 'Conservative investments will pay off...', 'published'),
('Tiger', 'Tigers are brave and confident...', 'Leadership opportunities arise...', 'Maintain regular exercise...', 'Exciting romantic prospects ahead...', 'Take calculated risks in investments...', 'published'),
('Rabbit', 'The Rabbit brings grace and luck...', 'Creative endeavors will succeed...', 'Focus on mental wellness...', 'Harmonious relationships flourish...', 'Financial stability improves...', 'published'),
('Dragon', 'Dragons are powerful and energetic...', 'Your ambitions will be realized...', 'Watch your energy levels...', 'Passionate connections form...', 'Abundance flows your way...', 'published'),
('Snake', 'The Snake is wise and mysterious...', 'Strategic thinking brings success...', 'Practice mindfulness...', 'Deep connections develop...', 'Smart investments yield returns...', 'published'),
('Horse', 'Horses are energetic and free-spirited...', 'New opportunities gallop in...', 'Stay active and vibrant...', 'Adventure in romance awaits...', 'Financial momentum builds...', 'published'),
('Goat', 'The Goat brings artistic flair...', 'Creative projects flourish...', 'Find balance in activities...', 'Gentle love connections bloom...', 'Steady financial growth...', 'published'),
('Monkey', 'Monkeys are clever and innovative...', 'Problem-solving skills shine...', 'Keep your mind active...', 'Playful romance develops...', 'Smart money moves pay off...', 'published'),
('Rooster', 'Roosters are confident and capable...', 'Your talents get recognized...', 'Maintain healthy routines...', 'Clear communication in love...', 'Financial planning succeeds...', 'published'),
('Dog', 'Dogs are loyal and honest...', 'Teamwork brings success...', 'Focus on emotional health...', 'Faithful relationships strengthen...', 'Steady wealth accumulation...', 'published'),
('Pig', 'The Pig brings abundance...', 'Professional growth continues...', 'Prioritize self-care...', 'Nurturing relationships bloom...', 'Prosperity increases...', 'published'); 