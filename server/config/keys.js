const dotenv = require('dotenv');
dotenv.config();

// Check for required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'NINJAVAN_CLIENT_ID',
  'NINJAVAN_CLIENT_SECRET',
  'DRAGONPAY_MERCHANT_ID',
  'DRAGONPAY_SECRET_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error('Missing required environment variables:', missingVars);
  console.error('Application cannot start without these variables in production.');
  process.exit(1);
}

module.exports = {
  NINJAVAN_API_URL: process.env.NINJAVAN_API_URL || 'https://api-sandbox.ninjavan.co',
  NINJAVAN_COUNTRY_CODE: process.env.NINJAVAN_COUNTRY_CODE || 'SG',
  NINJAVAN_CLIENT_ID: process.env.NINJAVAN_CLIENT_ID,
  NINJAVAN_CLIENT_SECRET: process.env.NINJAVAN_CLIENT_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
  DRAGONPAY_MERCHANT_ID: process.env.DRAGONPAY_MERCHANT_ID,
  DRAGONPAY_SECRET_KEY: process.env.DRAGONPAY_SECRET_KEY,
  DRAGONPAY_API_URL: process.env.DRAGONPAY_API_URL,
  NINJAVAN_WEBHOOK_SECRET: process.env.NINJAVAN_WEBHOOK_SECRET
}; 