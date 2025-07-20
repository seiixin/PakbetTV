const ninjaVanAuth = require('./services/ninjaVanAuth');
const config = require('./config/keys');

async function quickTest() {
  console.log('🔍 Quick NinjaVan Test\n');
  
  console.log('Configuration:');
  console.log(`  Environment: ${config.NINJAVAN_ENV}`);
  console.log(`  API URL: ${config.NINJAVAN_API_URL}`);
  console.log(`  Country: ${config.NINJAVAN_COUNTRY_CODE}`);
  console.log(`  Client ID: ${config.NINJAVAN_CLIENT_ID ? 'Set' : 'Not Set'}`);
  console.log(`  Client Secret: ${config.NINJAVAN_CLIENT_SECRET ? 'Set' : 'Not Set'}\n`);

  if (!config.NINJAVAN_CLIENT_ID || !config.NINJAVAN_CLIENT_SECRET) {
    console.log('❌ Please set NINJAVAN_CLIENT_ID and NINJAVAN_CLIENT_SECRET environment variables');
    return;
  }

  try {
    console.log('Testing authentication...');
    const token = await ninjaVanAuth.getValidToken();
    console.log('✅ Authentication successful!');
    console.log(`Token: ${token.substring(0, 20)}...`);
  } catch (error) {
    console.log('❌ Authentication failed:', error.message);
  }
}

quickTest(); 