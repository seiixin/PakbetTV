#!/usr/bin/env node

/**
 * NinjaVan Payload Test
 * Tests the payload structure being sent to NinjaVan API
 */

require('dotenv').config();
const config = require('./config/keys');

console.log('💼 NinjaVan Payload Structure Test\n');

// Test with sample data
const sampleOrderData = {
  order_id: '1234',
  payment_method: 'cod',
  total_amount: '290.00',
  items: [
    {
      name: 'Test Product',
      quantity: 1
    }
  ]
};

const sampleShippingAddress = {
  address1: 'Room 404',
  address2: 'Benison Inn',
  area: 'Basacdacu',
  city: 'Alburquerque',
  state: 'Bohol',
  postcode: '6000'
};

const sampleCustomerInfo = {
  first_name: 'Felix',
  last_name: 'Juaton',
  phone: '+639123456789',
  email: 'test@example.com'
};

console.log('🔧 Configuration:');
console.log(`   Environment: ${config.NINJAVAN_ENV}`);
console.log(`   Country Code: ${config.NINJAVAN_COUNTRY_CODE}`);
console.log(`   API URL: ${config.NINJAVAN_API_URL}`);

// Simulate the address formatting
function formatPhoneNumber(phone, countryCode) {
  if (!phone) return '';
  
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  
  if (countryCode === 'SG') {
    if (cleanPhone.startsWith('+65')) return cleanPhone;
    if (cleanPhone.startsWith('65')) return '+' + cleanPhone;
    if (cleanPhone.match(/^[89]\d{7}$/)) return '+65' + cleanPhone;
    return '+6591234567'; // Default Singapore number for testing
  } else {
    if (cleanPhone.startsWith('+63')) return cleanPhone;
    if (cleanPhone.startsWith('63')) return '+' + cleanPhone;
    if (cleanPhone.startsWith('0')) return '+63' + cleanPhone.substring(1);
    if (cleanPhone.match(/^9\d{9}$/)) return '+63' + cleanPhone;
    return cleanPhone;
  }
}

function formatAddressForCountry(address, countryCode) {
  if (countryCode === 'SG') {
    return {
      address1: address.address1 ? `${address.address1} Singapore Street` : "123 Singapore Street",
      address2: address.address2 || "",
      area: "Central Singapore",
      city: "Singapore",
      state: "Singapore",
      address_type: address.address_type || "home",
      country: "SG",
      postcode: "018956"
    };
  }
  
  return {
    address1: address.address1 || "",
    address2: address.address2 || "",
    area: address.area || address.city || "",
    city: address.city || "",
    state: address.state || "",
    address_type: address.address_type || "home",
    country: "PH",
    postcode: address.postcode || ""
  };
}

const COUNTRY_CODE = config.NINJAVAN_COUNTRY_CODE;
const formattedCustomerPhone = formatPhoneNumber(sampleCustomerInfo.phone, COUNTRY_CODE);
const formattedShopPhone = formatPhoneNumber("+639811949999", COUNTRY_CODE);

const shopAddress = formatAddressForCountry({
  address1: COUNTRY_CODE === 'SG' ? "1 Raffles Place" : "Unit 1004 Cityland Shaw Tower",
  address2: COUNTRY_CODE === 'SG' ? "#12-34" : "Corner St. Francis, Shaw Blvd.",
  area: COUNTRY_CODE === 'SG' ? "Central Singapore" : "Mandaluyong City",
  city: COUNTRY_CODE === 'SG' ? "Singapore" : "Mandaluyong City",
  state: COUNTRY_CODE === 'SG' ? "Singapore" : "NCR",
  address_type: "office",
  country: COUNTRY_CODE,
  postcode: COUNTRY_CODE === 'SG' ? "048616" : "486015"
}, COUNTRY_CODE);

const customerAddress = formatAddressForCountry({
  address1: sampleShippingAddress.address1,
  address2: sampleShippingAddress.address2,
  area: sampleShippingAddress.area || sampleShippingAddress.city,
  city: sampleShippingAddress.city,
  state: sampleShippingAddress.state,
  address_type: "home",
  country: COUNTRY_CODE,
  postcode: sampleShippingAddress.postcode
}, COUNTRY_CODE);

const requestedTrackingNumber = `${sampleOrderData.order_id}${Date.now()}`.slice(-9);

// Build the payload
const deliveryRequest = {
  requested_tracking_number: requestedTrackingNumber,
  service_type: "Parcel",
  service_level: "Standard",
  reference: {
    merchant_order_number: `SHIP-${sampleOrderData.order_id}`
  },
  from: {
    name: "Feng Shui by Pakbet TV",
    phone_number: formattedShopPhone,
    email: "store@fengshui-ecommerce.com",
    address: shopAddress
  },
  to: {
    name: `${sampleCustomerInfo.first_name} ${sampleCustomerInfo.last_name || ''}`.trim(),
    phone_number: formattedCustomerPhone,
    email: sampleCustomerInfo.email,
    address: customerAddress
  },
  parcel_job: {
    is_pickup_required: true,
    pickup_service_type: "Scheduled",
    pickup_service_level: "Standard",
    pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    pickup_timeslot: {
      start_time: "09:00",
      end_time: "12:00",
      timezone: COUNTRY_CODE === 'SG' ? "Asia/Singapore" : "Asia/Manila"
    },
    pickup_instructions: "Pickup with care!",
    delivery_instructions: "If recipient is not around, leave parcel in power riser.",
    delivery_start_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
    delivery_timeslot: {
      start_time: "09:00",
      end_time: "12:00",
      timezone: COUNTRY_CODE === 'SG' ? "Asia/Singapore" : "Asia/Manila"
    },
    dimensions: {
      weight: 0.5
    },
    items: sampleOrderData.items.map(item => ({
      item_description: item.name || "Product item",
      quantity: item.quantity || 1,
      is_dangerous_good: false
    }))
  }
};

// Add COD if needed
if (sampleOrderData.payment_method === 'cod') {
  let codAmount = parseFloat(sampleOrderData.total_amount);
  let codCurrency = COUNTRY_CODE === 'SG' ? 'SGD' : 'PHP';
  
  // For Singapore sandbox, convert PHP to SGD (rough conversion for testing)
  if (COUNTRY_CODE === 'SG') {
    codAmount = Math.round((codAmount * 0.027) * 100) / 100; // Convert PHP to SGD
    if (codAmount < 1) codAmount = 10.00;
  }
  
  deliveryRequest.parcel_job.cash_on_delivery = codAmount;
  deliveryRequest.parcel_job.cash_on_delivery_currency = codCurrency;
}

console.log('\n📦 Generated Payload:');
console.log(JSON.stringify(deliveryRequest, null, 2));

console.log('\n✅ Payload validation:');
console.log(`   Requested Tracking Number: ${deliveryRequest.requested_tracking_number}`);
console.log(`   From Phone: ${deliveryRequest.from.phone_number}`);
console.log(`   To Phone: ${deliveryRequest.to.phone_number}`);
console.log(`   From Country: ${deliveryRequest.from.address.country}`);
console.log(`   To Country: ${deliveryRequest.to.address.country}`);
console.log(`   COD: ${deliveryRequest.parcel_job.cash_on_delivery || 'No'}`);
console.log(`   Weight: ${deliveryRequest.parcel_job.dimensions.weight}kg`);

console.log('\n🎯 Test completed! Use this payload to debug API issues.');
