const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, admin } = require('../middleware/auth');
const axios = require('axios');
const config = require('../config/keys');
const ninjaVanAuth = require('../services/ninjaVanAuth');

// Ninja Van API Config
const API_BASE_URL = config.NINJAVAN_API_URL;
const COUNTRY_CODE = 'SG'; // Always use SG as per requirements

// Create the NinjaVan axios instance with token refresh
const ninjaVanApi = ninjaVanAuth.createAxiosInstance();

// Get NinjaVan access token
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

// Add a helper function to format postal code
function formatPostalCode(postcode) {
  if (!postcode) return "000000";
  
  // Convert to string and trim any whitespace
  const cleanPostcode = postcode.toString().trim();
  
  // If it's already 6 digits, return as is
  if (cleanPostcode.length === 6) return cleanPostcode;
  
  // If it's 4 digits, pad with leading zeros
  if (cleanPostcode.length === 4) return `00${cleanPostcode}`;
  
  // For any other case, pad with zeros until 6 digits
  return cleanPostcode.padStart(6, '0');
}

// Combine the payment confirmation and shipping order creation
router.post('/confirm-payment/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get order details
    const [orders] = await connection.query(
      'SELECT o.*, u.first_name, u.last_name, u.email, u.phone, u.user_id FROM orders o ' +
      'JOIN users u ON o.user_id = u.user_id ' +
      'WHERE o.order_id = ?',
      [orderId]
    );
    
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = orders[0];
    
    // Check if order is in the correct state
    if (order.payment_status !== 'awaiting_for_confirmation' || order.order_status !== 'processing') {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Order cannot be confirmed. It must be in processing status with payment awaiting confirmation.' 
      });
    }

    // Generate transaction ID
    const transactionId = `order_${orderId}_${Date.now()}`;
    
    // Update order status
    await connection.query(
      'UPDATE orders SET payment_status = ?, order_status = ?, updated_at = NOW() WHERE order_id = ?',
      ['paid', 'for_packing', orderId]
    );
    
    // Update payment status and transaction ID
    await connection.query(
      'UPDATE payments SET status = ?, transaction_id = ?, updated_at = NOW() WHERE order_id = ? AND status = ?',
      ['completed', transactionId, orderId, 'waiting_for_confirmation']
    );

    // Get user's shipping details
    const [shippingDetails] = await connection.query(
      'SELECT * FROM user_shipping_details WHERE user_id = ? AND is_default = 1',
      [order.user_id]
    );

    if (shippingDetails.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'No default shipping address found for user' });
    }

    const userShipping = shippingDetails[0];
    
    // Create shipping address string for shipping table
    const shippingAddressString = `${userShipping.address1}, ${userShipping.address2 || ''}, ${userShipping.city}, ${userShipping.state}, ${userShipping.postcode}, ${userShipping.country}`.trim().replace(/, ,/g, ',').replace(/,$/g, '');

    // Check if shipping record exists
    const [existingShipping] = await connection.query(
      'SELECT * FROM shipping WHERE order_id = ?',
      [orderId]
    );

    // Create or update shipping record
    if (existingShipping.length === 0) {
      await connection.query(
        'INSERT INTO shipping (order_id, user_id, address, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [orderId, order.user_id, shippingAddressString, 'pending']
      );
    } else {
      await connection.query(
        'UPDATE shipping SET status = ?, updated_at = NOW() WHERE order_id = ?',
        ['pending', orderId]
      );
    }

    // Check if shipping_details record exists
    const [existingShippingDetails] = await connection.query(
      'SELECT * FROM shipping_details WHERE order_id = ?',
      [orderId]
    );

    // Create or update shipping_details record
    if (existingShippingDetails.length === 0) {
      await connection.query(
        `INSERT INTO shipping_details (
          order_id, address1, address2, area, city, state, postcode, country, 
          region, province, city_municipality, barangay, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          orderId, userShipping.address1, userShipping.address2 || '', userShipping.area || '',
          userShipping.city, userShipping.state, userShipping.postcode, userShipping.country || 'SG',
          userShipping.region || '', userShipping.province || '', userShipping.city_municipality || '',
          userShipping.barangay || ''
        ]
      );
    }

    // Get order items
    const [orderItems] = await connection.query(
      'SELECT oi.*, p.name as product_name FROM order_items oi ' +
      'JOIN products p ON oi.product_id = p.product_id ' +
      'WHERE oi.order_id = ?',
      [orderId]
    );

    // Format items for NinjaVan
    const items = orderItems.map(item => ({
      item_description: item.product_name,
      quantity: item.quantity,
      is_dangerous_good: false
    }));

    // Calculate total weight
    const totalWeight = items.reduce((total, item) => total + (item.quantity * 0.5), 0) || 1.5;

    // Create unique tracking number
    const timestamp = Date.now().toString().slice(-4);
    const uniqueTrackingNumber = `${orderId}${timestamp}`.slice(-9);

    // Create the NinjaVan order payload
    const orderPayload = {
      service_type: "Parcel",
      service_level: "Standard",
      requested_tracking_number: uniqueTrackingNumber,
      reference: {
        merchant_order_number: `SHIP${orderId}${Date.now().toString().substring(7)}`
      },
      from: {
        name: "FengShui E-Commerce",
        phone_number: "+6591234567",
        email: "store@fengshui-ecommerce.com",
        address: {
          address1: "1 Changi Business Park",
          address2: "#01-01",
          area: "Changi Business Park",
          city: "Singapore",
          state: "Singapore",
          address_type: "office",
          country: "SG",
          postcode: "486015"
        }
      },
      to: {
        name: `${order.first_name} ${order.last_name}`,
        phone_number: order.phone || "+6591234567",
        email: order.email,
        address: {
          address1: userShipping.address1,
          address2: userShipping.address2 || "",
          area: userShipping.area || userShipping.district || "Default Area",
          city: userShipping.city,
          state: userShipping.state,
          address_type: "home",
          country: "SG",
          postcode: formatPostalCode(userShipping.postcode)
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
        delivery_start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        delivery_timeslot: {
          start_time: "09:00",
          end_time: "12:00",
          timezone: "Asia/Singapore"
        },
        dimensions: {
          weight: totalWeight
        },
        items: items
      }
    };

    try {
      // Get valid token
      const token = await ninjaVanAuth.getValidToken();

      // Create the order with NinjaVan
      const response = await ninjaVanApi.post(
        `/${COUNTRY_CODE}/4.2/orders`,
        orderPayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Store tracking information with retry mechanism
      if (response.data && response.data.tracking_number) {
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            await connection.query(
              'UPDATE shipping SET tracking_number = ?, carrier = ?, status = ?, updated_at = NOW() WHERE order_id = ?',
              [response.data.tracking_number, 'NinjaVan', 'pending', orderId]
            );
            
            // Also save tracking info to orders table for easier retrieval
            await connection.query(
              'UPDATE orders SET tracking_number = ? WHERE order_id = ?',
              [response.data.tracking_number, orderId]
            );
            
            // Also store in tracking_events table
            await connection.query(
              'INSERT INTO tracking_events (tracking_number, order_id, status, description, created_at) VALUES (?, ?, ?, ?, NOW())',
              [response.data.tracking_number, orderId, 'pending', 'Shipping order created']
            );
            
            // Update shipping_details with NinjaVan information
            // Store the entire shipping response as JSON in a metadata field if exists
            if (existingShippingDetails.length > 0) {
              await connection.query(
                'UPDATE shipping_details SET updated_at = NOW() WHERE order_id = ?',
                [orderId]
              );
            }
            
            break; // Success, exit retry loop
          } catch (updateError) {
            retryCount++;
            if (retryCount === maxRetries) {
              throw updateError;
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }

      await connection.commit();

      res.status(200).json({
        message: 'Payment confirmed and shipping order created successfully',
        order_status: 'for_packing',
        payment_status: 'paid',
        transaction_id: transactionId,
        shipping: response.data
      });

    } catch (shippingError) {
      console.error('Error creating shipping order:', shippingError);
      
      // Still commit the payment confirmation even if shipping creation fails
      await connection.commit();
      
      res.status(200).json({
        message: 'Payment confirmed but failed to create shipping order. Please create shipping manually.',
        order_status: 'for_packing',
        payment_status: 'paid',
        transaction_id: transactionId,
        error: shippingError.response?.data || shippingError.message
      });
    }

  } catch (error) {
    console.error('Error in confirm-payment:', error);
    await connection.rollback();
    
    res.status(500).json({
      message: 'Error processing payment confirmation',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// Create shipping order manually
router.post('/create-shipping/:orderId', async (req, res) => {
  const { orderId } = req.params;
  
  try {
    // Get order details including user info
    const [orders] = await db.query(
      'SELECT o.*, u.first_name, u.last_name, u.email, u.phone FROM orders o ' +
      'JOIN users u ON o.user_id = u.user_id ' +
      'WHERE o.order_id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orders[0];
    console.log('Order details:', order); // Debug log

    // Get user's shipping details
    const [shippingDetails] = await db.query(
      'SELECT * FROM user_shipping_details WHERE user_id = ? AND is_default = 1',
      [order.user_id]
    );

    console.log('Shipping details from DB:', shippingDetails); // Debug log

    if (shippingDetails.length === 0) {
      return res.status(400).json({ message: 'No default shipping address found for user' });
    }

    const userShipping = shippingDetails[0];
    console.log('User shipping to be used:', userShipping); // Debug log

    // Get order items
    const [orderItems] = await db.query(
      'SELECT oi.*, p.name as product_name FROM order_items oi ' +
      'JOIN products p ON oi.product_id = p.product_id ' +
      'WHERE oi.order_id = ?',
      [orderId]
    );

    // Format items for NinjaVan
    const items = orderItems.map(item => ({
      item_description: item.product_name,
      quantity: item.quantity,
      is_dangerous_good: false
    }));

    // Calculate total weight
    const totalWeight = items.reduce((total, item) => total + (item.quantity * 0.5), 0) || 1.5;

    // Create unique tracking number
    const timestamp = Date.now().toString().slice(-4);
    const uniqueTrackingNumber = `${orderId}${timestamp}`.slice(-9);

    // Create the NinjaVan order payload with user's shipping details
    const orderPayload = {
      service_type: "Parcel",
      service_level: "Standard",
      requested_tracking_number: uniqueTrackingNumber,
      reference: {
        merchant_order_number: `SHIP${orderId}${Date.now().toString().substring(7)}`
      },
      from: {
        name: "Feng Shui by Pakbet TV",
        phone_number: "+6591234567",
        email: "store@fengshui-ecommerce.com",
        address: {
          address1: "Unit 1004 Cityland Shaw Tower Corner St. Francis, Shaw Blvd.",
          address2: "",
          area: "Mandaluyong City, Philippines",
          city: "Singapore",
          state: "Singapore",
          address_type: "office",
          country: "SG",
          postcode: "486015"
        }
      },
      to: {
        name: `${order.first_name} ${order.last_name}`,
        phone_number: order.phone || "+6591234567",
        email: order.email,
        address: {
          address1: userShipping.address1,
          address2: userShipping.address2 || "",
          area: userShipping.area || userShipping.district || "Default Area",
          city: userShipping.city,
          state: userShipping.state,
          address_type: "home",
          country: "SG",
          postcode: formatPostalCode(userShipping.postcode)
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
        delivery_start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        delivery_timeslot: {
          start_time: "09:00",
          end_time: "12:00",
          timezone: "Asia/Singapore"
        },
        dimensions: {
          weight: totalWeight
        },
        items: items
      }
    };

    console.log('Final payload to NinjaVan:', JSON.stringify(orderPayload, null, 2)); // Debug log

    // Get valid token
    const token = await ninjaVanAuth.getValidToken();

    // Create the order with NinjaVan
    const response = await ninjaVanApi.post(
      `/${COUNTRY_CODE}/4.2/orders`,
      orderPayload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Store tracking information
    if (response.data && response.data.tracking_number) {
      await db.query(
        'UPDATE shipping SET tracking_number = ?, carrier = ?, status = ? WHERE order_id = ?',
        [response.data.tracking_number, 'NinjaVan', 'pending', orderId]
      );
    }

    res.status(200).json({
      message: 'Shipping order created successfully',
      shipping: response.data
    });

  } catch (error) {
    console.error('Error creating shipping order:', error);
    
    if (error.response?.data) {
      return res.status(error.response.status).json({
        message: 'Error creating shipping order',
        error: error.response.data
      });
    }

    res.status(500).json({
      message: 'Error creating shipping order',
      error: error.message
    });
  }
});

module.exports = router; 