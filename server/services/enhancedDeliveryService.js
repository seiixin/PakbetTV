/**
 * Enhanced Delivery Service for NinjaVan
 * 
 * This service extends the NinjaVan integration with structured shipping data support
 */
const axios = require('axios');
const config = require('../config/keys');
const db = require('../config/db');

// Constants
const API_BASE_URL = config.NINJAVAN_API_URL || 'https://api.ninjavan.co';
const COUNTRY_CODE = config.NINJAVAN_COUNTRY_CODE || 'MY'; // Default to Malaysia
const CLIENT_ID = config.NINJAVAN_CLIENT_ID;
const CLIENT_SECRET = config.NINJAVAN_CLIENT_SECRET;

/**
 * Gets authentication token from NinjaVan
 * @returns {Promise<string>} Access token
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
 * Get structured shipping address from database
 * @param {number} orderId - Order ID
 * @returns {Promise<Object>} Structured shipping address
 */
async function getStructuredShippingAddress(orderId) {
  try {
    // First try to get from shipping_details table
    const [detailsResults] = await db.query(
      'SELECT * FROM shipping_details WHERE order_id = ?',
      [orderId]
    );
    
    if (detailsResults && detailsResults.length > 0) {
      return {
        address1: detailsResults[0].address1,
        address2: detailsResults[0].address2 || '',
        area: detailsResults[0].area || '',
        city: detailsResults[0].city || '',
        state: detailsResults[0].state || '',
        postcode: detailsResults[0].postcode || '',
        country: detailsResults[0].country || COUNTRY_CODE,
        address_type: detailsResults[0].address_type || 'home'
      };
    }
    
    // Fall back to shipping table and parse
    const [shippingResults] = await db.query(
      'SELECT address FROM shipping WHERE order_id = ?',
      [orderId]
    );
    
    if (shippingResults && shippingResults.length > 0) {
      const addressString = shippingResults[0].address;
      
      // Parse address string
      const addressParts = addressString.split(',').map(part => part.trim());
      const address1 = addressParts[0] || '';
      
      // Extract postcode
      const postcodeMatch = addressString.match(/\d{5,6}/);
      const postcode = postcodeMatch ? postcodeMatch[0] : '';
      
      // Extract city and state
      let city = '', state = '';
      if (addressParts.length > 2) {
        city = addressParts[addressParts.length - 2] || '';
        state = addressParts[addressParts.length - 1] || '';
      }
      
      return {
        address1,
        address2: '',
        area: '',
        city,
        state,
        postcode,
        country: COUNTRY_CODE,
        address_type: 'home'
      };
    }
    
    throw new Error('No shipping address found for order');
  } catch (error) {
    console.error('Error getting structured shipping address:', error);
    throw error;
  }
}

/**
 * Create a delivery order with NinjaVan using structured shipping data
 * @param {number} orderId - Order ID
 * @returns {Promise<Object>} Delivery response from NinjaVan
 */
async function createDeliveryWithStructuredData(orderId) {
  try {
    // Get order information
    const [[order]] = await db.query(
      'SELECT o.*, p.payment_method FROM orders o ' +
      'LEFT JOIN payments p ON o.order_id = p.order_id ' +
      'WHERE o.order_id = ?',
      [orderId]
    );
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Get customer information
    const [[customer]] = await db.query(
      'SELECT * FROM users WHERE user_id = ?',
      [order.user_id]
    );
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Get order items
    const [orderItems] = await db.query(
      'SELECT oi.*, p.name FROM order_items oi ' +
      'JOIN products p ON oi.product_id = p.product_id ' +
      'WHERE oi.order_id = ?',
      [orderId]
    );
    
    // Get structured shipping address
    const shippingAddress = await getStructuredShippingAddress(orderId);
    
    // Get authentication token
    const token = await getNinjaVanToken();
    
    // Calculate total weight based on items (0.5kg per item as default)
    const totalWeight = orderItems.reduce((sum, item) => sum + (item.quantity * 0.5), 0) || 0.5;
    
    // Generate tracking number
    const timestamp = Date.now();
    const requestedTrackingNumber = `ORD-${orderId}-${timestamp}`;
    
    // Create delivery request
    const deliveryRequest = {
      requested_tracking_number: requestedTrackingNumber,
      service_type: "Parcel",
      service_level: "Standard",
      reference: {
        merchant_order_number: `FS-${orderId}`
      },
      from: {
        name: "FengShui E-Commerce Store",
        phone_number: "+60138201527", 
        email: "store@fengshui-ecommerce.com", 
        address: {
          address1: "30 Jln Kilang Barat", 
          address2: "",
          area: "Taman Sri Delima",
          city: "Kuala Lumpur",
          state: "Wilayah Persekutuan",
          address_type: "office",
          country: COUNTRY_CODE,
          postcode: "50350" 
        }
      },
      to: {
        name: `${customer.first_name} ${customer.last_name || ''}`,
        phone_number: customer.phone || "+60103067174", 
        email: customer.email,
        address: {
          address1: shippingAddress.address1,
          address2: shippingAddress.address2 || '',
          area: shippingAddress.area || shippingAddress.city,
          city: shippingAddress.city,
          state: shippingAddress.state,
          address_type: shippingAddress.address_type || 'home',
          country: shippingAddress.country || COUNTRY_CODE,
          postcode: shippingAddress.postcode
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
        items: orderItems.map(item => ({
          item_description: item.name || "Product item",
          quantity: item.quantity || 1,
          is_dangerous_good: false
        }))
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
    
    // Save tracking information
    if (response.data && response.data.tracking_number) {
      await db.query(
        'UPDATE shipping SET tracking_number = ?, carrier = ? WHERE order_id = ?',
        [response.data.tracking_number, 'NinjaVan', orderId]
      );
      
      // Log tracking event
      await db.query(
        'INSERT INTO tracking_events (tracking_number, order_id, status, description) VALUES (?, ?, ?, ?)',
        [response.data.tracking_number, orderId, 'created', 'Delivery order created with NinjaVan']
      );
    }
    
    return response.data;
  } catch (error) {
    console.error('Error creating NinjaVan delivery:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get tracking information for a delivery
 * @param {String} trackingNumber - Tracking number 
 * @returns {Promise<Object>} Tracking information
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
    
    // Save tracking events if they exist
    if (response.data && response.data.events) {
      // Get order ID for this tracking number
      const [[shipping]] = await db.query(
        'SELECT order_id FROM shipping WHERE tracking_number = ?',
        [trackingNumber]
      );
      
      if (shipping && shipping.order_id) {
        // Save each tracking event
        for (const event of response.data.events) {
          await db.query(
            'INSERT INTO tracking_events (tracking_number, order_id, status, description) ' +
            'VALUES (?, ?, ?, ?) ' +
            'ON DUPLICATE KEY UPDATE description = VALUES(description)',
            [trackingNumber, shipping.order_id, event.status, event.description]
          );
        }
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching tracking info:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Cancel a delivery order
 * @param {String} trackingNumber - Tracking number to cancel 
 * @returns {Promise<Object>} Cancellation response
 */
async function cancelDelivery(trackingNumber) {
  try {
    const token = await getNinjaVanToken();
    
    const response = await axios.post(
      `${API_BASE_URL}/${COUNTRY_CODE}/2.0/orders/${trackingNumber}/cancel`,
      {},
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    
    // Log cancellation in tracking events
    const [[shipping]] = await db.query(
      'SELECT order_id FROM shipping WHERE tracking_number = ?',
      [trackingNumber]
    );
    
    if (shipping && shipping.order_id) {
      await db.query(
        'INSERT INTO tracking_events (tracking_number, order_id, status, description) VALUES (?, ?, ?, ?)',
        [trackingNumber, shipping.order_id, 'cancelled', 'Delivery order cancelled']
      );
    }
    
    return response.data;
  } catch (error) {
    console.error('Error cancelling delivery:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Process a webhook event from NinjaVan
 * @param {Object} payload - Webhook event payload
 * @returns {Promise<Object>} Processing result
 */
async function processWebhook(payload) {
  try {
    // Log the webhook
    const [result] = await db.query(
      'INSERT INTO webhook_logs (provider, event_type, payload) VALUES (?, ?, ?)',
      ['NinjaVan', payload.event_type || 'unknown', JSON.stringify(payload)]
    );
    
    // Handle different event types
    if (payload.tracking_number) {
      const trackingNumber = payload.tracking_number;
      
      // Get order ID for this tracking number
      const [[shipping]] = await db.query(
        'SELECT order_id FROM shipping WHERE tracking_number = ?',
        [trackingNumber]
      );
      
      if (shipping && shipping.order_id) {
        const orderId = shipping.order_id;
        
        // Update order status based on event type
        let orderStatus = null;
        let shippingStatus = null;
        
        switch (payload.event_type) {
          case 'order.created':
            shippingStatus = 'pending';
            break;
          case 'order.picked_up':
            orderStatus = 'picked_up';
            shippingStatus = 'shipped';
            break;
          case 'order.out_for_delivery':
            orderStatus = 'for_shipping';
            shippingStatus = 'shipped';
            break;
          case 'order.delivered':
            orderStatus = 'delivered';
            shippingStatus = 'delivered';
            // Create order confirmation deadline (7 days)
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 7);
            await db.query(
              'INSERT INTO order_confirmations (order_id, deadline, status) VALUES (?, ?, ?) ' +
              'ON DUPLICATE KEY UPDATE deadline = VALUES(deadline)',
              [orderId, deadline, 'pending']
            );
            break;
          case 'order.cancelled':
            orderStatus = 'cancelled';
            break;
        }
        
        // Update order status if needed
        if (orderStatus) {
          await db.query(
            'UPDATE orders SET order_status = ? WHERE order_id = ?',
            [orderStatus, orderId]
          );
        }
        
        // Update shipping status if needed
        if (shippingStatus) {
          await db.query(
            'UPDATE shipping SET status = ? WHERE order_id = ?',
            [shippingStatus, orderId]
          );
        }
        
        // Log tracking event
        await db.query(
          'INSERT INTO tracking_events (tracking_number, order_id, status, description) VALUES (?, ?, ?, ?)',
          [trackingNumber, orderId, payload.event_type, payload.description || payload.event_type]
        );
      }
    }
    
    return { success: true, message: 'Webhook processed successfully' };
  } catch (error) {
    console.error('Error processing webhook:', error);
    throw error;
  }
}

module.exports = {
  createDeliveryWithStructuredData,
  getTrackingInfo,
  cancelDelivery,
  processWebhook,
  getStructuredShippingAddress
}; 