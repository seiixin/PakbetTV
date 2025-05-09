const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, admin } = require('../middleware/auth');
const axios = require('axios');
const config = require('../config/keys');
const ninjaVanAuth = require('../services/ninjaVanAuth');
const deliveryRouter = require('./delivery'); // Import delivery router for createShippingOrder function

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

    await connection.commit();

    try {
      // Use the shared delivery service to create the shipping order
      const shippingResult = await deliveryRouter.createShippingOrder(orderId);
      
      res.status(200).json({
        message: 'Payment confirmed and shipping order created successfully',
        order_status: 'for_packing',
        payment_status: 'paid',
        transaction_id: transactionId,
        shipping: shippingResult
      });
      
    } catch (shippingError) {
      console.error('Error creating shipping order:', shippingError);
      
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
    // Use the shared delivery service to create the shipping order
    const shippingResult = await deliveryRouter.createShippingOrder(orderId);
    
    res.status(200).json({
      message: 'Shipping order created successfully',
      shipping: shippingResult
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