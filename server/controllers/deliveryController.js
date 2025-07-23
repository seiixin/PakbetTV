const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/keys');
const ninjaVanAuth = require('../services/ninjaVanAuth');
const API_BASE_URL = config.NINJAVAN_API_URL || 'https://api.ninjavan.co';
const COUNTRY_CODE = config.NINJAVAN_COUNTRY_CODE || 'PH';
const db = require('../config/db');

function verifyNinjaVanSignature(req, res, next) {
  try {
    const receivedHmac = req.headers['x-ninjavan-hmac-sha256'];
    if (!receivedHmac) {
      console.error('Missing NinjaVan HMAC signature');
      return res.status(401).json({ message: 'Unauthorized: Missing signature' });
    }
    const rawBody = JSON.stringify(req.body);
    const clientSecret = config.NINJAVAN_CLIENT_SECRET;
    const calculatedHmac = crypto.createHmac('sha256', clientSecret)
      .update(rawBody)
      .digest('base64');
    if (calculatedHmac !== receivedHmac) {
      console.error('Invalid NinjaVan HMAC signature');
      return res.status(401).json({ message: 'Unauthorized: Invalid signature' });
    }
    next();
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function processNinjaVanWebhook(data) {
  try {
    const { tracking_id, event, status, timestamp, shipper_order_ref_no } = data;
    console.log(`Processing NinjaVan webhook: ${event} for tracking ${tracking_id}`);
    const [orders] = await db.query(
      'SELECT order_id FROM shipping WHERE tracking_number = ?',
      [tracking_id]
    );
    if (orders.length === 0) {
      console.error(`No order found for tracking number: ${tracking_id}`);
      return;
    }
    const orderId = orders[0].order_id;
    switch (event) {
      case 'Picked Up, In Transit To Origin Hub':
        await updateOrderStatus(orderId, 'picked_up', 'Picked up by NinjaVan');
        await saveTrackingEvent(tracking_id, orderId, event, 'Parcel picked up');
        break;
      case 'Delivered, Collected by Customer':
      case 'Delivered, Left at Doorstep':
      case 'Delivered, Received by Customer':
        await updateOrderStatus(orderId, 'delivered', 'Delivered to customer');
        await saveTrackingEvent(tracking_id, orderId, event, 'Parcel delivered');
        await sendDeliveryNotification(orderId);
        break;
      case 'Returned to Sender':
        await updateOrderStatus(orderId, 'returned', 'Returned to sender');
        await saveTrackingEvent(tracking_id, orderId, event, 'Parcel returned');
        break;
      case 'Cancelled':
        await updateOrderStatus(orderId, 'cancelled', 'Shipping cancelled');
        await saveTrackingEvent(tracking_id, orderId, event, 'Shipping cancelled');
        break;
      default:
        console.log(`Ignoring NinjaVan event: ${event}`);
    }
  } catch (error) {
    console.error('Error processing NinjaVan webhook:', error);
  }
}

async function updateOrderStatus(orderId, status, description) {
  try {
    await db.query(
      'UPDATE orders SET order_status = ?, updated_at = NOW() WHERE order_id = ?',
      [status, orderId]
    );
    await db.query(
      'UPDATE shipping SET status = ?, updated_at = NOW() WHERE order_id = ?',
      [status, orderId]
    );
    console.log(`Updated status for order ${orderId} to ${status}`);
  } catch (error) {
    console.error(`Error updating order status for order ${orderId}:`, error);
    throw error;
  }
}

async function saveTrackingEvent(trackingNumber, orderId, status, description) {
  try {
    await db.query(
      'INSERT INTO tracking_events (tracking_number, order_id, status, description, created_at) VALUES (?, ?, ?, ?, NOW())',
      [trackingNumber, orderId, status, description]
    );
    console.log(`Saved tracking event for order ${orderId}: ${status}`);
  } catch (error) {
    console.error(`Error saving tracking event for order ${orderId}:`, error);
    throw error;
  }
}

async function sendDeliveryNotification(orderId) {
  try {
    const [orders] = await db.query(
      'SELECT o.*, u.email FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.order_id = ?',
      [orderId]
    );
    if (orders.length === 0) return;
    const order = orders[0];
    console.log(`Would send delivery notification to ${order.email} for order ${orderId}`);
  } catch (error) {
    console.error(`Error sending delivery notification for order ${orderId}:`, error);
  }
}

async function ninjavanWebhookHandler(req, res) {
  try {
    res.status(200).send('OK');
    processNinjaVanWebhook(req.body).catch(err => {
      console.error('Error processing NinjaVan webhook:', err);
    });
  } catch (error) {
    console.error('Error in webhook route:', error);
  }
}

async function createOrder(req, res) {
  try {
    const token = await ninjaVanAuth.getValidToken();
    const orderData = req.body;
    const response = await axios.post(
      `${API_BASE_URL}/${COUNTRY_CODE}/4.2/orders`, 
      orderData,
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error creating NinjaVan order:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to create delivery order',
      details: error.response?.data || error.message
    });
  }
}

async function getTracking(req, res) {
  try {
    const trackingInfo = {
      trackingId: req.params.trackingId,
      status: "Pending Pickup", 
      lastUpdate: new Date().toISOString(),
    };
    res.status(200).json(trackingInfo);
  } catch (error) {
    console.error('Error fetching tracking info:', error.message);
    res.status(500).json({ error: 'Failed to retrieve tracking information' });
  }
}

async function getWaybill(req, res) {
  try {
    const token = await ninjaVanAuth.getValidToken();
    const trackingId = req.params.trackingId;
    const response = await axios.get(
      `${API_BASE_URL}/${COUNTRY_CODE}/2.0/reports/waybill?tid=${trackingId}`,
      { 
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
        responseType: 'arraybuffer'
      }
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="waybill-${trackingId}.pdf"`);
    res.status(200).send(response.data);
  } catch (error) {
    console.error('Error generating waybill:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to generate waybill',
      details: error.response?.data || error.message
    });
  }
}

async function estimateShipping(req, res) {
  /**
   * Enhanced shipping rate calculation with proper fallbacks
   * 
   * Primary: Use NinjaVan database for accurate rates
   * Fallback 1: Use static rates based on region classification
   * Fallback 2: Default Philippine standard rate
   */
  try {
    const {
      toAddress = {},
      weight = 1 // default 1 kg when none supplied
    } = req.body || {};

    if (!toAddress.state) {
      return res.status(400).json({
        success: false,
        error: 'Destination state/province is required for shipping calculation',
        estimatedFee: 250.00, // Fallback rate
        fallbackUsed: 'default'
      });
    }

    console.log('🚚 [SHIPPING] Calculating shipping for:', {
      state: toAddress.state,
      city: toAddress.city,
      weight: weight
    });

    let shippingFee = 250.00; // Default fallback
    let fallbackUsed = null;
    let serviceDetails = {};

    try {
      // Try to get shipping rate from NinjaVan locations database
      const db = require('../config/db');
      
      // Check if address is serviceable and get zone information
      const [locationRows] = await db.query(
        `SELECT status, "Zone Name", province_name, municipality_name 
         FROM Shipping_Locations_Ninjavan 
         WHERE LOWER(province_name) LIKE LOWER(?) 
         LIMIT 1`,
        [`%${toAddress.state}%`]
      );

      if (locationRows && locationRows.length > 0) {
        const location = locationRows[0];
        const zoneName = location['Zone Name'] || '';
        
        // Calculate rate based on database zone information
        shippingFee = calculateZoneBasedRate(zoneName, weight);
        serviceDetails = {
          zone: zoneName,
          province: location.province_name,
          municipality: location.municipality_name,
          serviceable: location.status && location.status.toLowerCase().includes('serviceable')
        };
        
        console.log('✅ [SHIPPING] Database rate calculation successful:', {
          zone: zoneName,
          fee: shippingFee,
          serviceable: serviceDetails.serviceable
        });
      } else {
        // Fallback to region-based calculation
        shippingFee = calculateRegionBasedRate(toAddress.state, weight);
        fallbackUsed = 'region-based';
        console.log('⚠️ [SHIPPING] Using region-based fallback rate:', shippingFee);
      }
    } catch (dbError) {
      console.error('❌ [SHIPPING] Database error, using region fallback:', dbError.message);
      shippingFee = calculateRegionBasedRate(toAddress.state, weight);
      fallbackUsed = 'region-based';
    }

    // Ensure minimum shipping fee
    shippingFee = Math.max(shippingFee, 150.00);

    const response = {
      success: true,
      estimatedFee: Math.round(shippingFee * 100) / 100, // Round to 2 decimal places
      currency: 'PHP',
      weight: weight,
      destination: {
        state: toAddress.state,
        city: toAddress.city || '',
        country: 'PH'
      },
      serviceDetails,
      fallbackUsed,
      message: fallbackUsed ? 
        'Estimated rate using fallback calculation' : 
        'Rate calculated from delivery database'
    };

    console.log('🚚 [SHIPPING] Final calculation result:', response);
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ [SHIPPING] Error calculating shipping fee:', error);
    
    // Always provide a fallback rate, never fail completely
    const fallbackResponse = {
      success: true,
      estimatedFee: 250.00,
      currency: 'PHP',
      weight: req.body?.weight || 1,
      destination: {
        state: req.body?.toAddress?.state || 'Unknown',
        city: req.body?.toAddress?.city || '',
        country: 'PH'
      },
      fallbackUsed: 'error-fallback',
      message: 'Using standard Philippine shipping rate due to calculation error',
      error: 'Shipping calculation temporarily unavailable'
    };

    res.status(200).json(fallbackResponse);
  }
}

/**
 * Calculate shipping rate based on NinjaVan zone classification
 */
function calculateZoneBasedRate(zoneName, weight) {
  const zones = {
    // Metro Manila and nearby areas
    'MM': { base: 150, perKg: 50 },
    'METRO MANILA': { base: 150, perKg: 50 },
    
    // Greater Manila Area, North & South Luzon
    'GMA_NLZ_SLZ': { base: 200, perKg: 75 },
    'LUZON': { base: 200, perKg: 75 },
    'NORTH LUZON': { base: 200, perKg: 75 },
    'SOUTH LUZON': { base: 200, perKg: 75 },
    
    // Visayas
    'VIS': { base: 280, perKg: 100 },
    'VISAYAS': { base: 280, perKg: 100 },
    
    // Mindanao
    'MIN': { base: 320, perKg: 120 },
    'MINDANAO': { base: 320, perKg: 120 }
  };

  const zone = zones[zoneName.toUpperCase()] || zones['LUZON']; // Default to Luzon rates
  
  if (weight <= 0.5) {
    return zone.base - 30; // Discount for very light items
  } else if (weight <= 1) {
    return zone.base;
  } else if (weight <= 3) {
    return zone.base + (zone.perKg * 0.5);
  } else {
    // For over 3kg, charge base rate for first 3kg + per kg for excess
    const excessWeight = Math.ceil(weight - 3);
    return zone.base + (zone.perKg * 0.5) + (excessWeight * zone.perKg);
  }
}

/**
 * Fallback calculation based on province/region names
 */
function calculateRegionBasedRate(state, weight) {
  const metroManilaProvinces = [
    'ncr', 'metro manila', 'national capital region', 'manila', 
    'quezon city', 'caloocan', 'las piñas', 'las pinas', 'makati',
    'malabon', 'mandaluyong', 'marikina', 'muntinlupa', 'navotas',
    'parañaque', 'paranaque', 'pasay', 'pasig', 'san juan', 'taguig',
    'valenzuela', 'pateros'
  ];

  const luzonProvinces = [
    'bataan', 'batangas', 'bulacan', 'cavite', 'laguna', 'nueva ecija',
    'pampanga', 'rizal', 'tarlac', 'zambales', 'aurora', 'batanes',
    'cagayan', 'isabela', 'nueva vizcaya', 'quirino', 'albay',
    'camarines norte', 'camarines sur', 'catanduanes', 'masbate',
    'sorsogon', 'abra', 'apayao', 'benguet', 'ifugao', 'kalinga',
    'mountain province', 'ilocos norte', 'ilocos sur', 'la union',
    'pangasinan'
  ];

  const visayasProvinces = [
    'aklan', 'antique', 'capiz', 'guimaras', 'iloilo', 'negros occidental',
    'bohol', 'cebu', 'negros oriental', 'siquijor', 'biliran',
    'eastern samar', 'leyte', 'northern samar', 'samar', 'southern leyte'
  ];

  const mindanaoProvinces = [
    'zamboanga del norte', 'zamboanga del sur', 'zamboanga sibugay',
    'bukidnon', 'camiguin', 'lanao del norte', 'misamis occidental',
    'misamis oriental', 'davao de oro', 'davao del norte', 'davao del sur',
    'davao occidental', 'davao oriental', 'cotabato', 'sarangani',
    'south cotabato', 'sultan kudarat', 'agusan del norte', 'agusan del sur',
    'dinagat islands', 'surigao del norte', 'surigao del sur',
    'basilan', 'lanao del sur', 'maguindanao', 'sulu', 'tawi-tawi'
  ];

  const stateLower = state.toLowerCase();

  if (metroManilaProvinces.some(province => stateLower.includes(province))) {
    return calculateZoneBasedRate('MM', weight);
  } else if (luzonProvinces.some(province => stateLower.includes(province))) {
    return calculateZoneBasedRate('LUZON', weight);
  } else if (visayasProvinces.some(province => stateLower.includes(province))) {
    return calculateZoneBasedRate('VISAYAS', weight);
  } else if (mindanaoProvinces.some(province => stateLower.includes(province))) {
    return calculateZoneBasedRate('MINDANAO', weight);
  } else {
    // Default to Luzon rates for unknown provinces
    return calculateZoneBasedRate('LUZON', weight);
  }
}

async function cancelOrder(req, res) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const trackingId = req.params.trackingId;
    const userId = req.user?.id || req.user?.user?.id;
    const isAdmin = (req.user?.userType || req.user?.user?.userType) === 'admin';
    if (!userId) {
      await connection.rollback();
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!trackingId || trackingId.length < 9) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Invalid tracking number format',
        details: 'Tracking number must be at least 9 characters long'
      });
    }
    const [shipping] = await connection.query(
      'SELECT s.*, o.order_status, o.user_id, o.order_id FROM shipping s ' +
      'JOIN orders o ON s.order_id = o.order_id ' +
      'WHERE s.tracking_number = ?',
      [trackingId]
    );
    if (shipping.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Order not found',
        details: 'No order found with the provided tracking number'
      });
    }
    const order = shipping[0];
    if (!isAdmin && order.user_id !== userId) {
      await connection.rollback();
      return res.status(403).json({ 
        message: 'Access denied',
        details: 'You can only cancel your own orders'
      });
    }
    const cancelableStatuses = ['processing', 'for_packing', 'packed', 'for_shipping', 'pending'];
    if (!cancelableStatuses.includes(order.order_status)) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Order cannot be cancelled',
        details: `Orders with status '${order.order_status}' cannot be cancelled. Only orders that are pending pickup can be cancelled.`,
        currentStatus: order.order_status
      });
    }
    const token = await ninjaVanAuth.getValidToken();
    let ninjaVanResponse;
    try {
      const ninjaVanCancelResponse = await axios.delete(
        `${API_BASE_URL}/${COUNTRY_CODE}/2.2/orders/${trackingId}`,
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      ninjaVanResponse = ninjaVanCancelResponse.data;
    } catch (ninjaVanError) {
      await connection.rollback();
      if (ninjaVanError.response?.status === 404) {
        return res.status(404).json({
          message: 'Order not found with delivery provider',
          details: 'The order may have already been cancelled or does not exist with NinjaVan'
        });
      } else if (ninjaVanError.response?.status === 400) {
        return res.status(400).json({
          message: 'Order cannot be cancelled with delivery provider',
          details: ninjaVanError.response?.data?.message || 'The order status prevents cancellation'
        });
      } else {
        console.error('NinjaVan cancellation error:', ninjaVanError.response?.data || ninjaVanError.message);
        return res.status(502).json({
          message: 'Failed to cancel order with delivery provider',
          details: 'Please try again later or contact support'
        });
      }
    }
    await connection.query(
      'UPDATE orders SET order_status = ?, updated_at = NOW() WHERE order_id = ?',
      ['cancelled', order.order_id]
    );
    await connection.query(
      'UPDATE shipping SET status = ?, updated_at = NOW() WHERE order_id = ?',
      ['cancelled', order.order_id]
    );
    const [orderItems] = await connection.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [order.order_id]
    );
    for (const item of orderItems) {
      const [variants] = await connection.query(
        'SELECT variant_id, stock FROM product_variants WHERE product_id = ? ORDER BY variant_id ASC LIMIT 1',
        [item.product_id]
      );
      if (variants.length > 0) {
        const variantId = variants[0].variant_id;
        const newStock = variants[0].stock + item.quantity;
        await connection.query(
          'UPDATE product_variants SET stock = ? WHERE variant_id = ?',
          [newStock, variantId]
        );
        await connection.query(
          'INSERT INTO inventory (variant_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)',
          [variantId, 'add', item.quantity, `Order ${order.order_id} cancelled - tracking ${trackingId}`]
        );
      }
    }
    await connection.query(
      'INSERT INTO tracking_events (tracking_number, order_id, status, description, created_at) VALUES (?, ?, ?, ?, NOW())',
      [trackingId, order.order_id, 'Cancelled', 'Order cancelled by user request']
    );
    await connection.query(
      'UPDATE payments SET status = ?, updated_at = NOW() WHERE order_id = ? AND status = ?',
      ['refunded', order.order_id, 'completed']
    );
    await connection.commit();
    res.status(200).json({
      message: 'Order cancelled successfully',
      data: {
        trackingId: ninjaVanResponse.trackingId || trackingId,
        status: ninjaVanResponse.status || 'cancelled',
        updatedAt: ninjaVanResponse.updatedAt || new Date().toISOString(),
        orderId: order.order_id,
        refundStatus: 'pending_processing'
      },
      ninjaVanResponse
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error cancelling order:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      details: 'An unexpected error occurred while cancelling the order. Please try again later or contact support.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
}

async function getTrackingInfo(req, res) {
  try {
    const { trackingId } = req.params;
    const [events] = await db.query(
      'SELECT * FROM tracking_events WHERE tracking_number = ? ORDER BY created_at DESC',
      [trackingId]
    );
    const [shipping] = await db.query(
      'SELECT * FROM shipping WHERE tracking_number = ?',
      [trackingId]
    );
    if (shipping.length === 0) {
      return res.status(404).json({ message: 'Tracking information not found' });
    }
    const [orders] = await db.query(
      'SELECT order_status FROM orders WHERE order_id = ?',
      [shipping[0].order_id]
    );
    const currentStatus = events.length > 0 ? events[0].status : 'Pending';
    res.json({
      trackingId,
      currentStatus,
      carrierName: shipping[0].carrier || 'NinjaVan',
      orderStatus: orders[0].order_status,
      events: events
    });
  } catch (error) {
    console.error('Error fetching tracking information:', error);
    res.status(500).json({ message: 'Error fetching tracking information' });
  }
}

async function createShippingOrder(orderId) {
  console.log(`🚚 Starting createShippingOrder for order ${orderId}`);
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get order details including payment status with retry mechanism
    let orders = [];
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries && orders.length === 0) {
      [orders] = await connection.query(
        'SELECT o.*, u.first_name, u.last_name, u.email, u.phone, u.user_id FROM orders o ' +
        'JOIN users u ON o.user_id = u.user_id ' +
        'WHERE o.order_id = ?',
        [orderId]
      );
      
      if (orders.length === 0) {
        retryCount++;
        console.log(`Order ${orderId} not found, retry ${retryCount}/${maxRetries}`);
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
    }
    
    if (orders.length === 0) {
      await connection.rollback();
      throw new Error(`Order not found after ${maxRetries} retries`);
    }
    
    const order = orders[0];
    console.log(`Order details: payment_status=${order.payment_status}, order_status=${order.order_status}`);
    
    // IMPORTANT: Check payment status before creating shipping order
    if (order.payment_status !== 'paid' && order.payment_status !== 'cod_pending') {
      await connection.rollback();
      throw new Error(`Cannot create shipping order for order ${orderId}. Payment status is '${order.payment_status}', but 'paid' or 'cod_pending' is required. Please confirm payment first.`);
    }
    
    // Additional validation for order status
    const validOrderStatuses = ['for_packing', 'packed', 'for_shipping'];
    if (!validOrderStatuses.includes(order.order_status)) {
      await connection.rollback();
      throw new Error(`Cannot create shipping order for order ${orderId}. Order status is '${order.order_status}', but one of [${validOrderStatuses.join(', ')}] is required.`);
    }
    
    console.log(`Payment confirmed for order ${orderId} (${order.payment_status}), proceeding with shipping order creation`);
    
    // Validate required customer information - STRICT: No fallbacks allowed
    if (!order.phone || !order.phone.trim()) {
      await connection.rollback();
      throw new Error(`Customer phone number is required for shipping. Order ${orderId} cannot proceed without a valid phone number. Please ensure the customer provides their phone number before creating shipping orders.`);
    }
    
    if (!order.email || !order.email.trim()) {
      await connection.rollback();
      throw new Error(`Customer email is required for shipping. Order ${orderId} cannot proceed without a valid email.`);
    }
    
    if (!order.first_name || !order.first_name.trim()) {
      await connection.rollback();
      throw new Error(`Customer name is required for shipping. Order ${orderId} cannot proceed without a valid name.`);
    }
    
    console.log(`Customer information validated for order ${orderId}: phone=${order.phone}, email=${order.email}, name=${order.first_name} ${order.last_name}`);
    
    // Get user's shipping details
    const [shippingDetails] = await connection.query(
      'SELECT * FROM user_shipping_details WHERE user_id = ? AND is_default = 1',
      [order.user_id]
    );

    if (shippingDetails.length === 0) {
      await connection.rollback();
      throw new Error('No default shipping address found for user');
    }

    const userShipping = shippingDetails[0];
    console.log(`Shipping address found: ${userShipping.address1}, ${userShipping.city}, ${userShipping.state} ${userShipping.postcode}`);
    
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
      console.log(`Created shipping record for order ${orderId}`);
    } else {
      await connection.query(
        'UPDATE shipping SET status = ?, updated_at = NOW() WHERE order_id = ?',
        ['pending', orderId]
      );
      console.log(`Updated shipping record for order ${orderId}`);
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
          userShipping.city, userShipping.state, userShipping.postcode, userShipping.country || 'PH',
          userShipping.region || '', userShipping.province || '', userShipping.city_municipality || '',
          userShipping.barangay || ''
        ]
      );
      console.log(`Created shipping_details record for order ${orderId}`);
    }

    // Get order items
    const [orderItems] = await connection.query(
      'SELECT oi.*, p.name as product_name FROM order_items oi ' +
      'JOIN products p ON oi.product_id = p.product_id ' +
      'WHERE oi.order_id = ?',
      [orderId]
    );

    console.log(`Found ${orderItems.length} items for order ${orderId}`);

    // Format items for NinjaVan
    const items = orderItems.map(item => ({
      item_description: item.product_name,
      quantity: item.quantity,
      is_dangerous_good: false
    }));

    // Calculate total weight
    const totalWeight = items.reduce((total, item) => total + (item.quantity * 0.5), 0) || 1.5;
    console.log(`Calculated total weight: ${totalWeight}kg`);

    // Create unique tracking number
    const timestamp = Date.now().toString().slice(-4);
    const uniqueTrackingNumber = `${orderId}${timestamp}`.slice(-9);
    console.log(`Generated tracking number: ${uniqueTrackingNumber}`);

    // Format postal code function
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

    // Create the NinjaVan order payload
    const orderPayload = {
      service_type: "Parcel",
      service_level: "Standard",
      requested_tracking_number: uniqueTrackingNumber,
      reference: {
        merchant_order_number: `SHIP${orderId}${Date.now().toString().substring(7)}`
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
          country: "PH",
          postcode: "486015"
        }
      },
      to: {
        name: `${order.first_name} ${order.last_name}`,
        phone_number: order.phone,
        email: order.email,
        address: {
          address1: userShipping.address1,
          address2: userShipping.address2 || "",
          area: userShipping.area || userShipping.district || "Default Area",
          city: userShipping.city,
          state: userShipping.state,
          address_type: "home",
          country: "PH",
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
          timezone: "Asia/Manila"
        },
        pickup_instructions: "Pickup with care!",
        delivery_instructions: "If recipient is not around, leave parcel in power riser.",
        delivery_start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        delivery_timeslot: {
          start_time: "09:00",
          end_time: "12:00",
          timezone: "Asia/Manila"
        },
        dimensions: {
          weight: totalWeight
        },
        items: items
      }
    };

    if (order.payment_method === 'cod') {
      orderPayload.parcel_job.cash_on_delivery = parseFloat(order.total_price);
      orderPayload.parcel_job.cash_on_delivery_currency = "PHP"; // Adjust based on your country
      
      console.log(`COD enabled for order ${orderId}: ${orderPayload.parcel_job.cash_on_delivery} PHP`);
    }

    console.log(`Preparing to call NinjaVan API for order ${orderId}`);
    console.log(`API URL: ${API_BASE_URL}/${COUNTRY_CODE}/4.2/orders`);
    console.log(`Payload preview:`, {
      requested_tracking_number: orderPayload.requested_tracking_number,
      from: orderPayload.from.name,
      to: orderPayload.to.name,
      items_count: orderPayload.parcel_job.items.length
    });

    try {
      // Get NinjaVan token
      console.log(`Getting NinjaVan token...`);
      const token = await ninjaVanAuth.getValidToken();
      console.log(`NinjaVan token obtained successfully`);

      // Create the order with NinjaVan
      console.log(`Calling NinjaVan API...`);
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

      console.log(`NinjaVan API call successful!`);
      console.log(`NinjaVan response:`, {
        tracking_number: response.data?.tracking_number,
        status: response.data?.status,
        order_id: response.data?.order_id
      });

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
            if (existingShippingDetails.length > 0) {
              await connection.query(
                'UPDATE shipping_details SET updated_at = NOW() WHERE order_id = ?',
                [orderId]
              );
            }
            
            console.log(`Successfully stored tracking number ${response.data.tracking_number} in database`);
            break; // Success, exit retry loop
          } catch (updateError) {
            retryCount++;
            console.error(`❌ Database update error (attempt ${retryCount}/${maxRetries}):`, updateError.message);
            if (retryCount === maxRetries) {
              throw updateError;
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      } else {
        console.warn(`⚠️ NinjaVan response did not contain tracking_number:`, response.data);
      }

      await connection.commit();
      console.log(`Transaction committed successfully for order ${orderId}`);
      return response.data;

    } catch (shippingError) {
      console.error(`❌ Error creating shipping order for order ${orderId}:`, shippingError.message);
      if (shippingError.response) {
        console.error(`📋 NinjaVan API Error Details:`, {
          status: shippingError.response.status,
          statusText: shippingError.response.statusText,
          data: shippingError.response.data
        });
      }
      await connection.commit(); // Still commit the transaction even if shipping creation fails
      throw shippingError;
    }

  } catch (error) {
    console.error(`❌ Error in createShippingOrder for order ${orderId}:`, error.message);
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
          console.log(`createShippingOrder completed for order ${orderId}`);
  }
}

module.exports = {
  verifyNinjaVanSignature,
  ninjavanWebhookHandler,
  createOrder,
  getTracking,
  getWaybill,
  estimateShipping,
  cancelOrder,
  getTrackingInfo,
  createShippingOrder
};
