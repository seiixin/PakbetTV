const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, admin } = require('../middleware/auth');
const axios = require('axios');
const config = require('../config/keys');

// Ninja Van API Config
const API_BASE_URL = config.NINJAVAN_API_URL || 'https://api-sandbox.ninjavan.co';
const COUNTRY_CODE = config.NINJAVAN_COUNTRY_CODE || 'MY'; // Default to Malaysia
const CLIENT_ID = config.NINJAVAN_CLIENT_ID;
const CLIENT_SECRET = config.NINJAVAN_CLIENT_SECRET;

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

// Confirm payment and update order status
router.post('/confirm-payment/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get order details
    const [orders] = await connection.query(
      'SELECT o.*, u.first_name, u.last_name, u.email, u.phone FROM orders o ' +
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
    
    // Update order status
    await connection.query(
      'UPDATE orders SET payment_status = ?, order_status = ?, updated_at = NOW() WHERE order_id = ?',
      ['paid', 'for_packing', orderId]
    );
    
    // Update payment status
    await connection.query(
      'UPDATE payments SET status = ?, updated_at = NOW() WHERE order_id = ? AND status = ?',
      ['completed', orderId, 'waiting_for_confirmation']
    );
    
    // Get order items for shipping
    const [orderItems] = await connection.query(
      'SELECT oi.*, p.name as product_name FROM order_items oi ' +
      'JOIN products p ON oi.product_id = p.product_id ' +
      'WHERE oi.order_id = ?',
      [orderId]
    );
    
    // Get shipping details
    const [shippingDetails] = await connection.query(
      'SELECT * FROM user_shipping_details WHERE user_id = ? AND is_default = 1',
      [order.user_id]
    );
    
    let shippingAddress = {
      address1: "Default Address",
      address2: "",
      area: "Default Area",
      city: "Kuala Lumpur",
      state: "Kuala Lumpur",
      address_type: "home",
      country: "MY",
      postcode: "50000"
    };
    
    if (shippingDetails.length > 0) {
      // Use the stored shipping details
      shippingAddress = {
        address1: shippingDetails[0].address1 || "Default Address",
        address2: shippingDetails[0].address2 || "",
        area: shippingDetails[0].area || "Default Area",
        city: shippingDetails[0].city || "Kuala Lumpur",
        state: shippingDetails[0].state || "Kuala Lumpur",
        address_type: shippingDetails[0].address_type || "home",
        country: "MY", // Hardcode to MY to ensure correct country
        postcode: shippingDetails[0].postcode || "50000"
      };
    } else {
      // Get alternative shipping info if no default address exists
      const [shipping] = await connection.query(
        'SELECT * FROM shipping WHERE order_id = ?',
        [orderId]
      );
      
      if (shipping.length > 0) {
        // Try to parse the generic address to extract components
        const addressParts = shipping[0].address.split(',').map(part => part.trim());
        
        shippingAddress = {
          address1: addressParts[0] || "Default Address",
          address2: addressParts.length > 1 ? addressParts[1] : "",
          area: addressParts.length > 2 ? addressParts[2] : "Default Area",
          city: addressParts.length > 3 ? addressParts[3] : "Kuala Lumpur",
          state: addressParts.length > 4 ? addressParts[4] : "Kuala Lumpur",
          address_type: "home",
          country: "MY",
          postcode: shipping[0].address.match(/\d{5,6}/) ? shipping[0].address.match(/\d{5,6}/)[0] : "50000"
        };
      }
    }
    
    // Create shipping order
    try {
      // Format the order items for NinjaVan API
      const items = orderItems.map(item => ({
        item_description: item.product_name,
        quantity: item.quantity,
        is_dangerous_good: false
      }));
      
      // Calculate total weight (0.5kg per item as a default)
      const totalWeight = items.reduce((total, item) => total + (item.quantity * 0.5), 0) || 1.5;
      
      // Create the NinjaVan order payload
      const orderPayload = {
        service_type: "Parcel",
        service_level: "Standard",
        requested_tracking_number: `ORD-${orderId}`,
        reference: {
          merchant_order_number: `SHIP-${orderId}-${Date.now().toString().substring(7)}`
        },
        from: {
          name: "FengShui E-Commerce",
          phone_number: "+60138201527", // Shop phone number
          email: "store@fengshui-ecommerce.com", // Shop email
          address: {
            address1: "17 Lorong Jambu 3",
            address2: "",
            area: "Taman Sri Delima",
            city: "Simpang Ampat",
            state: "Pulau Pinang",
            address_type: "office",
            country: "MY",
            postcode: "51200"
          }
        },
        to: {
          name: `${order.first_name} ${order.last_name}`,
          phone_number: order.phone || "+60103067174", // Default if not available
          email: order.email,
          address: shippingAddress
        },
        parcel_job: {
          is_pickup_required: true,
          pickup_service_type: "Scheduled",
          pickup_service_level: "Standard",
          pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
          pickup_timeslot: {
            start_time: "09:00",
            end_time: "12:00",
            timezone: "Asia/Kuala_Lumpur"
          },
          pickup_instructions: "Pickup with care!",
          delivery_instructions: "If recipient is not around, leave parcel in power riser.",
          delivery_start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // One week later
          delivery_timeslot: {
            start_time: "09:00",
            end_time: "12:00",
            timezone: "Asia/Kuala_Lumpur"
          },
          dimensions: {
            weight: totalWeight
          },
          items: items
        }
      };
      
      console.log('Creating NinjaVan order with payload:', JSON.stringify(orderPayload));
      
      // Get NinjaVan access token
      const token = await getNinjaVanToken();
      
      // Create the order with NinjaVan
      const response = await axios.post(
        `${API_BASE_URL}/${COUNTRY_CODE}/4.2/orders`,
        orderPayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('NinjaVan order created successfully:', response.data);
      
      // Store tracking information if available
      if (response.data && response.data.tracking_number) {
        await connection.query(
          'UPDATE shipping SET tracking_number = ?, carrier = ?, status = ? WHERE order_id = ?',
          [response.data.tracking_number, 'NinjaVan', 'pending', orderId]
        );
      }
      
      await connection.commit();
      
      res.status(200).json({
        message: 'Payment confirmed and shipping order created.',
        order_status: 'for_packing',
        payment_status: 'paid',
        shipping: response.data || null
      });
      
    } catch (shippingError) {
      console.error('Error creating shipping order:', shippingError);
      
      // Log more detailed error information
      if (shippingError.response) {
        console.error('NinjaVan API error response:', shippingError.response.data);
      }
      
      // Still update the order status even if shipping creation fails
      await connection.commit();
      
      res.status(200).json({
        message: 'Payment confirmed but failed to create shipping order. Please create shipping manually.',
        order_status: 'for_packing',
        payment_status: 'paid',
        error: shippingError.message
      });
    }
    
  } catch (err) {
    await connection.rollback();
    console.error('Error confirming payment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
});

// Create shipping order manually
router.post('/create-shipping/:orderId', [auth, admin], async (req, res) => {
  const { orderId } = req.params;
  const shippingDetails = req.body;
  
  try {
    // Validate required fields
    if (!shippingDetails.to || !shippingDetails.to.address) {
      return res.status(400).json({ message: 'Shipping address is required' });
    }
    
    // Ensure country code is set to MY if not provided
    if (shippingDetails.to && shippingDetails.to.address) {
      shippingDetails.to.address.country = shippingDetails.to.address.country || 'MY';
    }
    if (shippingDetails.from && shippingDetails.from.address) {
      shippingDetails.from.address.country = shippingDetails.from.address.country || 'MY';
    }
    
    // Get NinjaVan access token
    const token = await getNinjaVanToken();
    
    console.log('Creating manual NinjaVan order with payload:', JSON.stringify(shippingDetails));
    
    // Create the order with NinjaVan
    const response = await axios.post(
      `${API_BASE_URL}/${COUNTRY_CODE}/4.2/orders`,
      shippingDetails,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Manual NinjaVan order created successfully:', response.data);
    
    // Store tracking information if available
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
    
  } catch (err) {
    console.error('Error creating shipping order:', err);
    
    // Log more detailed error information
    if (err.response) {
      console.error('NinjaVan API error response:', err.response.data);
    }
    
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 