/**
 * Test Address Formatting Fix
 * Testing the updated address formatting with actual user data
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

// Map detailed address fields to NinjaVan format (as done in deliveryController)
const recipientAddressData = {
  address1: userShippingData.address1 || `${userShippingData.house_number || ''} ${userShippingData.street_name || ''}`.trim() || "Default Address",
  address2: userShippingData.address2 || userShippingData.building || "",
  area: userShippingData.area || userShippingData.barangay || userShippingData.district || "Default Area",
  city: userShippingData.city || userShippingData.city_municipality || "Default City",
  state: userShippingData.state || userShippingData.province || "Default State",
  postcode: userShippingData.postcode
};

// Test sender address (Philippines postcode in sandbox)
const senderAddressData = {
  address1: "Unit 1004 Cityland Shaw Tower",
  address2: "Corner St. Francis, Shaw Blvd.",
  area: "Mandaluyong City",
  city: "Mandaluyong City", 
  state: "NCR",
  address_type: "office",
  postcode: COUNTRY_CODE === 'SG' ? "018956" : "1550"
};

console.log('=== ADDRESS FORMATTING FIX TEST ===');
console.log(`Environment: ${COUNTRY_CODE} (Sandbox)`);
console.log('\nOriginal User Data:');
console.log('User Shipping:', JSON.stringify(userShippingData, null, 2));

console.log('\nMapped Address Data:');
console.log('Recipient Data:', JSON.stringify(recipientAddressData, null, 2));
console.log('Sender Data:', JSON.stringify(senderAddressData, null, 2));

const formattedRecipient = formatAddressForCountry(recipientAddressData, COUNTRY_CODE);
const formattedSender = formatAddressForCountry(senderAddressData, COUNTRY_CODE);

console.log('\n=== FORMATTED FOR NINJAVAN ===');
console.log('Sender Address:');
console.log(JSON.stringify(formattedSender, null, 2));
console.log('\nRecipient Address:');
console.log(JSON.stringify(formattedRecipient, null, 2));

console.log('\n=== VALIDATION CHECKS ===');
const senderValid = formattedSender.country === 'SG' && formattedSender.postcode.length === 6;
const recipientValid = formattedRecipient.country === 'SG' && formattedRecipient.postcode === '060000';

console.log(`✅ Sender Address: Country=${formattedSender.country}, Postcode=${formattedSender.postcode} (${senderValid ? 'VALID' : 'INVALID'})`);
console.log(`✅ Recipient Address: Country=${formattedRecipient.country}, Postcode=${formattedRecipient.postcode} (${recipientValid ? 'VALID' : 'INVALID'})`);
console.log(`✅ Address Mapping: ${formattedRecipient.address1} (${formattedRecipient.address1 !== 'Default Address' ? 'MAPPED' : 'DEFAULT'})`);

const allValid = senderValid && recipientValid;
console.log(`\n${allValid ? '✅ PASS' : '❌ FAIL'}: Address formatting fix test`);
