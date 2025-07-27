/**
 * Test Address Formatting for NinjaVan
 * Verify that user addresses are properly formatted for different environments
 */

// Mock environment configuration
const COUNTRY_CODE = 'SG'; // Sandbox mode

/**
 * Format address for NinjaVan based on country code
 */
function formatAddressForCountry(address, countryCode) {
  if (countryCode === 'SG') {
    // For Singapore sandbox, use user's actual address but ensure Singapore formatting
    return {
      address1: address.address1 || "123 Singapore Street",
      address2: address.address2 || "",
      area: address.area || address.city || "Central Singapore",
      city: "Singapore", // Must be Singapore for SG
      state: "Singapore", // Must be Singapore for SG  
      address_type: address.address_type || "home",
      country: "SG",
      postcode: address.postcode || "018956" // Use user's postcode or default
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

/**
 * Format phone number based on country code
 */
function formatPhoneNumber(phone, countryCode) {
  if (!phone) return '';
  
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  
  if (countryCode === 'SG') {
    // Singapore format: +65XXXXXXXX
    if (cleanPhone.startsWith('+65')) return cleanPhone;
    if (cleanPhone.startsWith('65')) return '+' + cleanPhone;
    if (cleanPhone.match(/^[89]\d{7}$/)) return '+65' + cleanPhone;
    return '+6591234567'; // Default Singapore number for testing
  } else {
    // Philippines format: +63XXXXXXXXXX
    if (cleanPhone.startsWith('+63')) return cleanPhone;
    if (cleanPhone.startsWith('63')) return '+' + cleanPhone;
    if (cleanPhone.startsWith('0')) return '+63' + cleanPhone.substring(1);
    if (cleanPhone.match(/^9\d{9}$/)) return '+63' + cleanPhone;
    return cleanPhone; // Return as is if already formatted
  }
}

// Test with user's actual data from the screenshot
const userShippingData = {
  address1: "123 Singapore Street",
  address2: "",
  area: "",
  city: "Singapore",
  state: "Singapore",
  postcode: "018956"
};

const userPhone = "+6591234567";

console.log('=== ADDRESS FORMATTING TEST ===');
console.log(`Environment: ${COUNTRY_CODE} (Sandbox)`);
console.log('\nOriginal User Data:');
console.log(JSON.stringify(userShippingData, null, 2));

const formattedAddress = formatAddressForCountry(userShippingData, COUNTRY_CODE);
const formattedPhone = formatPhoneNumber(userPhone, COUNTRY_CODE);

console.log('\nFormatted for NinjaVan:');
console.log('Address:', JSON.stringify(formattedAddress, null, 2));
console.log('Phone:', formattedPhone);

console.log('\n=== EXPECTED vs ACTUAL ===');
console.log('✅ Expected: User\'s actual address (123 Singapore Street) should be preserved');
console.log('✅ Expected: Singapore city/state format enforced');
console.log('✅ Expected: SG country code');
console.log('✅ Expected: User\'s postcode (018956) preserved');

const success = 
  formattedAddress.address1 === userShippingData.address1 &&
  formattedAddress.city === "Singapore" &&
  formattedAddress.state === "Singapore" &&
  formattedAddress.country === "SG" &&
  formattedAddress.postcode === userShippingData.postcode &&
  formattedPhone.startsWith('+65');

console.log(`\n${success ? '✅ PASS' : '❌ FAIL'}: Address formatting test`);
