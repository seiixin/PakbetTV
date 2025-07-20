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

// NinjaVan Environment Configuration
const NINJAVAN_ENV = process.env.NINJAVAN_ENV || 'sandbox';
const NINJAVAN_COUNTRY = process.env.NINJAVAN_COUNTRY_CODE || 'PH';

// DragonPay Environment Configuration
const DRAGONPAY_ENV = process.env.DRAGONPAY_ENV || 'sandbox';

// Determine NinjaVan base URL based on environment and region
function getNinjaVanBaseUrl() {
  if (NINJAVAN_ENV === 'sandbox') {
    return 'https://api-sandbox.ninjavan.co';
  }
  
  // For production, check if it's China
  if (NINJAVAN_ENV === 'production' && NINJAVAN_COUNTRY === 'CN') {
    return 'https://api.ninjavan.cn';
  }
  
  // Default production URL
  return 'https://api.ninjavan.co';
}

// Determine DragonPay base URL based on environment
function getDragonPayBaseUrl() {
  if (DRAGONPAY_ENV === 'sandbox') {
    return 'https://test.dragonpay.ph';
  }
  
  // Production URL
  return 'https://gw.dragonpay.ph';
}

// Determine DragonPay API URL based on environment
function getDragonPayApiUrl() {
  if (DRAGONPAY_ENV === 'sandbox') {
    return 'https://test.dragonpay.ph/api/collect/v1';
  }
  
  // Production API URL
  return 'https://gw.dragonpay.ph/api/collect/v1';
}

module.exports = {
  // NinjaVan Configuration
  NINJAVAN_API_URL: process.env.NINJAVAN_API_URL || getNinjaVanBaseUrl(),
  NINJAVAN_COUNTRY_CODE: NINJAVAN_COUNTRY,
  NINJAVAN_ENV: NINJAVAN_ENV,
  NINJAVAN_CLIENT_ID: process.env.NINJAVAN_CLIENT_ID,
  NINJAVAN_CLIENT_SECRET: process.env.NINJAVAN_CLIENT_SECRET,
  NINJAVAN_WEBHOOK_SECRET: process.env.NINJAVAN_WEBHOOK_SECRET,
  
  // DragonPay Configuration
  DRAGONPAY_ENV: DRAGONPAY_ENV,
  DRAGONPAY_BASE_URL: process.env.DRAGONPAY_BASE_URL || getDragonPayBaseUrl(),
  DRAGONPAY_API_URL: process.env.DRAGONPAY_API_URL || getDragonPayApiUrl(),
  DRAGONPAY_MERCHANT_ID: process.env.DRAGONPAY_MERCHANT_ID,
  DRAGONPAY_SECRET_KEY: process.env.DRAGONPAY_SECRET_KEY,
  
  // General Configuration
  JWT_SECRET: process.env.JWT_SECRET
}; 