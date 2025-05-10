const dotenv = require('dotenv');
dotenv.config();
module.exports = {
  NINJAVAN_API_URL: process.env.NINJAVAN_API_URL || 'https://api-sandbox.ninjavan.co',
  NINJAVAN_COUNTRY_CODE: process.env.NINJAVAN_COUNTRY_CODE || 'SG',
  NINJAVAN_CLIENT_ID: process.env.NINJAVAN_CLIENT_ID || 'your_client_id',
  NINJAVAN_CLIENT_SECRET: process.env.NINJAVAN_CLIENT_SECRET || 'your_client_secret',
  JWT_SECRET: process.env.JWT_SECRET,
  DRAGONPAY_MERCHANT_ID: process.env.DRAGONPAY_MERCHANT_ID,
  DRAGONPAY_SECRET_KEY: process.env.DRAGONPAY_SECRET_KEY,
  DRAGONPAY_API_URL: process.env.DRAGONPAY_API_URL,
  NINJAVAN_WEBHOOK_SECRET: process.env.NINJAVAN_WEBHOOK_SECRET || 'your_webhook_secret'
}; 