const ninjaVanAuth = require('./services/ninjaVanAuth');
const config = require('./config/keys');

async function testNinjaVanAuth() {
  console.log('🧪 Testing NinjaVan Authentication...');
  console.log('📋 Configuration:');
  console.log('  API URL:', config.NINJAVAN_API_URL);
  console.log('  Country Code:', config.NINJAVAN_COUNTRY_CODE);
  console.log('  Client ID:', config.NINJAVAN_CLIENT_ID);
  console.log('  Client Secret:', config.NINJAVAN_CLIENT_SECRET ? '***SET***' : '***NOT SET***');
  
  try {
    console.log('\n🔑 Attempting to get NinjaVan token...');
    const token = await ninjaVanAuth.getValidToken();
    console.log('✅ Token obtained successfully!');
    console.log('  Token preview:', token.substring(0, 20) + '...');
    
    // Test the correct API endpoint with a sample order payload
    console.log('\n🌐 Testing API connection with sample order...');
    const axios = require('axios');
    
    // Sample order payload based on NinjaVan API documentation
    const sampleOrder = {
      service_type: "Parcel",
      service_level: "Standard",
      requested_tracking_number: "123456789",
      reference: {
        merchant_order_number: "TEST-ORDER-001"
      },
      from: {
        name: "Feng Shui by Pakbet TV",
        phone_number: "+639811949999",
        email: "store@fengshui-ecommerce.com",
        address: {
          address1: "Unit 1004 Cityland Shaw Tower",
          address2: "Corner St. Francis, Shaw Blvd.",
          area: "Mandaluyong City",
          city: "Mandaluyong City",
          state: "NCR",
          address_type: "office",
          country: "SG",
          postcode: "486015"
        }
      },
      to: {
        name: "Test Customer",
        phone_number: "+6591234567",
        email: "test@example.com",
        address: {
          address1: "123 Test Street",
          address2: "",
          area: "Test Area",
          city: "Singapore",
          state: "Singapore",
          address_type: "home",
          country: "SG",
          postcode: "123456"
        }
      },
      parcel_job: {
        is_pickup_required: true,
        pickup_service_type: "Scheduled",
        pickup_service_level: "Standard",
        pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        pickup_timeslot: {
          start_time: "09:00",
          end_time: "12:00",
          timezone: "Asia/Singapore"
        },
        pickup_instructions: "Pickup with care!",
        delivery_instructions: "If recipient is not around, leave parcel in power riser.",
        delivery_start_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
        delivery_timeslot: {
          start_time: "09:00",
          end_time: "12:00",
          timezone: "Asia/Singapore"
        },
        dimensions: {
          weight: 1.0
        },
        items: [
          {
            item_description: "Test Product",
            quantity: 1,
            is_dangerous_good: false
          }
        ]
      }
    };
    
    console.log('📤 Sending test order to NinjaVan...');
    const response = await axios.post(
      `${config.NINJAVAN_API_URL}/${config.NINJAVAN_COUNTRY_CODE}/4.2/orders`,
      sampleOrder,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ API connection successful!');
    console.log('  Status:', response.status);
    console.log('  Response:', {
      tracking_number: response.data?.tracking_number,
      status: response.data?.status,
      order_id: response.data?.order_id
    });
    
  } catch (error) {
    console.error('❌ NinjaVan API test failed:');
    console.error('  Error:', error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testNinjaVanAuth().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Test failed:', error);
  process.exit(1);
}); 