const axios = require('axios');
const config = require('../config/keys');

const API_BASE_URL = config.NINJAVAN_API_URL || 'https://api.ninjavan.co';
const COUNTRY_CODE = config.NINJAVAN_COUNTRY_CODE || 'MY';
const CLIENT_ID = config.NINJAVAN_CLIENT_ID;
const CLIENT_SECRET = config.NINJAVAN_CLIENT_SECRET;

/**
 * Get OAuth token for NinjaVan API
 */
async function getNinjaVanToken() {
  try {
    const response = await axios.post(`${API_BASE_URL}/${COUNTRY_CODE}/2.0/oauth/access_token`, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials"
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting NinjaVan access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with NinjaVan');
  }
}

/**
 * Create a delivery order with NinjaVan
 * @param {Object} orderData - Order information including items
 * @param {Object|String} shippingAddress - Address details 
 * @param {Object} customerInfo - Customer information
 * @returns {Object} Delivery response from NinjaVan
 */
async function createDeliveryOrder(orderData, shippingAddress, customerInfo) {
  try {
    let address1 = '', address2 = '', area = '', city = '', state = '', postcode = '';
    
    // Validate and format shipping address
    if (typeof shippingAddress === 'string') {
      // Parse string address
      const addressParts = shippingAddress.split(',').map(part => part.trim());
      
      // Extract address components more reliably
      address1 = addressParts[0] || '';
      
      // Extract postcode with validation
      const postcodeMatch = shippingAddress.match(/\b\d{5,6}\b/);
      postcode = postcodeMatch ? postcodeMatch[0] : '';
      
      // Extract city and state more reliably
      const remainingParts = addressParts.filter(part => !part.match(/\b\d{5,6}\b/));
      if (remainingParts.length >= 2) {
        city = remainingParts[remainingParts.length - 2] || '';
        state = remainingParts[remainingParts.length - 1] || '';
        // If there are parts between address1 and city, use them as area
        if (remainingParts.length > 2) {
          area = remainingParts.slice(1, -2).join(', ');
        }
      }
    } else if (typeof shippingAddress === 'object' && shippingAddress !== null) {
      // Use shipping address object with validation
      address1 = shippingAddress.address1 || '';
      address2 = shippingAddress.address2 || '';
      area = shippingAddress.area || '';
      city = shippingAddress.city || '';
      state = shippingAddress.state || '';
      postcode = shippingAddress.postcode || '';
    }

    // Validate required address fields
    if (!address1 || !city || !state || !postcode) {
      throw new Error('Missing required address fields. Please ensure address1, city, state, and postcode are provided.');
    }

    // Format address components
    address1 = address1.trim();
    city = city.trim();
    state = state.trim();
    postcode = postcode.trim();
    
    // Generate consistent tracking number format
    const timestamp = Date.now();
    const requestedTrackingNumber = `FES-${orderData.order_id}-${timestamp}`;
    
    // Create delivery request with validated address
    const deliveryRequest = {
      requested_tracking_number: requestedTrackingNumber,
      tracking_number: requestedTrackingNumber,
      service_type: "Parcel",
      service_level: "Standard",
      reference: {
        merchant_order_number: `SHIP-${orderData.order_id}`
      },
      from: {
        name: "FengShui E-Commerce Store",
        phone_number: "+60138201527",
        email: "store@fengshui-ecommerce.com",
        address: {
          address1: "30 Jln Kilang Barat",
          address2: "",
          area: "Taman Sri Delima",
          city: "Simpang Ampat",
          state: "Pulau Pinang",
          address_type: "office",
          country: COUNTRY_CODE,
          postcode: "51200"
        }
      },
      to: {
        name: `${customerInfo.first_name} ${customerInfo.last_name || ''}`.trim(),
        phone_number: customerInfo.phone || "+60103067174",
        email: customerInfo.email,
        address: {
          address1: address1,
          address2: address2,
          area: area || city,
          city: city,
          state: state,
          address_type: "home",
          country: COUNTRY_CODE,
          postcode: postcode
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
          timezone: "Asia/Kuala_Lumpur"
        },
        pickup_approximate_volume: "Less than 3 Parcels",
        pickup_instructions: "Pickup with care!",
        delivery_start_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
        delivery_timeslot: {
          start_time: "09:00",
          end_time: "12:00",
          timezone: "Asia/Kuala_Lumpur"
        },
        delivery_instructions: "If recipient is not around, leave parcel in power riser.",
        allow_weekend_delivery: true,
        dimensions: {
          weight: totalWeight > 0 ? totalWeight : 0.5
        },
        items: orderData.items ? orderData.items.map(item => ({
          item_description: item.name || "Product item",
          quantity: item.quantity || 1,
          is_dangerous_good: false
        })) : [{
          item_description: "Product from order",
          quantity: 1,
          is_dangerous_good: false
        }]
      }
    };
    
    // Call NinjaVan API to create delivery
    const response = await axios.post(
      `${API_BASE_URL}/${COUNTRY_CODE}/4.2/orders`, 
      deliveryRequest,
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating NinjaVan delivery:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get tracking information for a delivery
 * @param {String} trackingNumber - Tracking number 
 * @returns {Object} Tracking information
 */
async function getTrackingInfo(trackingNumber) {
  try {
    const token = await getNinjaVanToken();
    
    const response = await axios.get(
      `${API_BASE_URL}/${COUNTRY_CODE}/2.2/orders/${trackingNumber}/tracking`,
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching tracking info:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Cancel a delivery order
 * @param {String} trackingNumber - Tracking number 
 * @returns {Object} Cancellation response
 */
async function cancelDelivery(trackingNumber) {
  try {
    const token = await getNinjaVanToken();
    
    const response = await axios.delete(
      `${API_BASE_URL}/${COUNTRY_CODE}/2.2/orders/${trackingNumber}`,
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error cancelling delivery:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  createDeliveryOrder,
  getTrackingInfo,
  cancelDelivery
}; 