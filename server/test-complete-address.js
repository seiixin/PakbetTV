/**
 * Test Complete Address Building
 * Testing the updated address mapping with full address components
 */

const COUNTRY_CODE = 'SG'; // Sandbox mode

/**
 * Format address for NinjaVan based on country code
 */
function formatAddressForCountry(address, countryCode) {
  if (countryCode === 'SG') {
    // For Singapore sandbox, override country and format postcode
    let singaporePostcode = address.postcode || "018956";
    
    // If postcode is 4 digits (like Philippines 6000), add leading zeros to make it 6 digits
    if (singaporePostcode.length === 4) {
      singaporePostcode = `0${singaporePostcode}0`; // 6000 becomes 060000
    } else if (singaporePostcode.length < 6) {
      singaporePostcode = singaporePostcode.padStart(6, '0');
    }
    
    return {
      address1: address.address1 || "123 Singapore Street",
      address2: address.address2 || "",
      area: address.area || address.city || "Central Singapore",
      city: "Singapore", // Must be Singapore for SG
      state: "Singapore", // Must be Singapore for SG  
      address_type: address.address_type || "home",
      country: "SG", // Override to SG for sandbox
      postcode: singaporePostcode
    };
  }
  
  // For Philippines (production), use as provided but with validation
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

// Test with actual user data from the logs
const userShippingData = {
  address1: '', // Empty
  address2: null,
  area: null,
  city: null,
  state: null,
  postcode: '6000', // Philippines 4-digit postcode
  country: 'PH',
  address_type: 'home',
  region: 'Region VII',
  province: 'Bohol',
  city_municipality: 'Alburquerque',
  barangay: 'Basacdacu',
  street_name: 'N Bacalso Ave',
  building: 'Benison Inn',
  house_number: 'Room 404'
};

// NEW: Build complete address mapping
const recipientAddressData = {
  address1: userShippingData.address1 || 
            `${[
              userShippingData.house_number,
              userShippingData.building,
              userShippingData.street_name,
              userShippingData.barangay,
              userShippingData.city_municipality,
              userShippingData.province
            ].filter(Boolean).join(', ')}` || "Default Address",
  address2: userShippingData.address2 || "",
  area: userShippingData.area || userShippingData.barangay || userShippingData.district || "Default Area",
  city: userShippingData.city || userShippingData.city_municipality || "Default City", 
  state: userShippingData.state || userShippingData.province || "Default State",
  postcode: userShippingData.postcode
};

console.log('=== COMPLETE ADDRESS BUILDING TEST ===');
console.log(`Environment: ${COUNTRY_CODE} (Sandbox)`);
console.log('\nOriginal User Data:');
console.log('User Shipping:', JSON.stringify(userShippingData, null, 2));

console.log('\n=== ADDRESS COMPONENTS ===');
console.log('Individual components:');
console.log('- house_number:', userShippingData.house_number);
console.log('- building:', userShippingData.building);
console.log('- street_name:', userShippingData.street_name);
console.log('- barangay:', userShippingData.barangay);
console.log('- city_municipality:', userShippingData.city_municipality);
console.log('- province:', userShippingData.province);
console.log('- postcode:', userShippingData.postcode);

console.log('\n=== BUILT ADDRESS ===');
console.log('Complete Address (address1):', recipientAddressData.address1);
console.log('Expected Full Address: "Room 404, Benison Inn, N Bacalso Ave, Basacdacu, Alburquerque, Bohol"');

const formattedRecipient = formatAddressForCountry(recipientAddressData, COUNTRY_CODE);

console.log('\n=== FINAL NINJAVAN FORMAT ===');
console.log('Formatted Address:');
console.log(JSON.stringify(formattedRecipient, null, 2));

console.log('\n=== COMPARISON ===');
console.log('✅ Expected: Room 404, Benison Inn, N Bacalso Ave, Basacdacu, Alburquerque, Bohol');
console.log('🎯 Actual  :', formattedRecipient.address1);
console.log(`📍 Country  : ${formattedRecipient.country}`);
console.log(`📮 Postcode : ${formattedRecipient.postcode}`);

const hasCompleteAddress = formattedRecipient.address1.includes('Room 404') && 
                          formattedRecipient.address1.includes('Benison Inn') &&
                          formattedRecipient.address1.includes('N Bacalso Ave') &&
                          formattedRecipient.address1.includes('Basacdacu') &&
                          formattedRecipient.address1.includes('Alburquerque') &&
                          formattedRecipient.address1.includes('Bohol');

console.log(`\n${hasCompleteAddress ? '✅ PASS' : '❌ FAIL'}: Complete address building test`);
console.log(`Address components included: ${hasCompleteAddress ? 'ALL' : 'PARTIAL'}`);
