const db = require('../config/db');
const config = require('../config/keys');
const ninjaVanAuth = require('../services/ninjaVanAuth');
const deliveryRouter = require('../routes/delivery'); // Import delivery router for createShippingOrder function
const { sendOrderConfirmationEmail } = require('../services/emailService');
const { runManualPaymentCheck } = require('../cron/paymentStatusChecker'); // Import manual payment check

// Ninja Van API Config
const API_BASE_URL = config.NINJAVAN_API_URL;
const COUNTRY_CODE = 'SG'; // Always use SG as per requirements

// Create the NinjaVan axios instance with token refresh
const ninjaVanApi = ninjaVanAuth.createAxiosInstance();

// Note: Using ninjaVanAuth service for token management with caching

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

// Handler for GET /api/admin/check-payments
async function checkPayments(req, res) {
  try {
    console.log('🔧 Manual Dragonpay Transaction Status Query check triggered via API');
    
    const result = await runManualPaymentCheck();
    
    res.status(200).json({
      success: true,
      message: 'Dragonpay Transaction Status check completed',
      data: {
        status: result.status,
        checked: result.checked || 0,
        updated: result.updated || 0,
        errors: result.errors || 0,
        skipped: result.skipped || 0,
        retries: result.retries || 0,
        duration: result.duration || 0,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`✅ Manual check completed via API: ${result.updated || 0} orders updated`);
    
  } catch (error) {
    console.error('❌ Error in manual payment check API:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Error running payment status check',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Handler for GET /api/admin/payments/check
async function paymentsCheck(req, res) {
  try {
    console.log('🌐 Global Dragonpay check triggered from frontend');
    
    const result = await runManualPaymentCheck();
    
    // Simple response for frontend consumption
    res.status(200).json({
      success: true,
      checked: result.checked || 0,
      updated: result.updated || 0,
      message: result.updated > 0 ? 
        `${result.updated} payment(s) processed successfully` : 
        'No pending payments found',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in global payment check:', error.message);
    
    res.status(200).json({
      success: false,
      checked: 0,
      updated: 0,
      message: 'Payment check failed',
      timestamp: new Date().toISOString()
    });
  }
}

// Handler for POST /api/admin/confirm-payment/:orderId
async function confirmPayment(req, res) {
  const { orderId } = req.params;
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get order details
    const [orders] = await connection.query(
      'SELECT o.*, u.first_name, u.last_name, u.email, u.phone, u.user_id, ' +
      's.address as shipping_address, s.tracking_number ' +
      'FROM orders o ' +
      'JOIN users u ON o.user_id = u.user_id ' +
      'LEFT JOIN shipping s ON o.order_id = s.order_id ' +
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

    // Get order items for email
    const [orderItems] = await connection.query(
      `SELECT oi.*, p.name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

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

    // Get payment details for email
    const [payments] = await connection.query(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY payment_id DESC LIMIT 1',
      [orderId]
    );

    // Prepare email details
    const emailDetails = {
      orderNumber: orderId,
      customerName: `${order.first_name} ${order.last_name}`,
      customerEmail: order.email,
      customerPhone: order.phone,
      items: orderItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: order.total_price,
      shippingFee: 0, // Shipping fee not stored in shipping table
      shippingAddress: order.shipping_address,
      paymentMethod: payments.length > 0 ? payments[0].payment_method : 'Unknown',
      paymentReference: payments.length > 0 ? payments[0].reference_number : transactionId,
      trackingNumber: order.tracking_number
    };

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail(emailDetails);
      console.log('Order confirmation email sent successfully');
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
      // Don't fail the transaction if email fails
    }

    await connection.commit();

    try {
      // Use the shared delivery service to create the shipping order
      const shippingResult = await deliveryRouter.createShippingOrder(orderId);
      
      // Send another email with tracking number if it wasn't included in the first email
      if (shippingResult.tracking_number && !order.tracking_number) {
        const updatedEmailDetails = {
          ...emailDetails,
          trackingNumber: shippingResult.tracking_number
        };

        try {
          await sendOrderConfirmationEmail(updatedEmailDetails);
          console.log('Updated order confirmation email sent with tracking number');
        } catch (emailError) {
          console.error('Failed to send updated order confirmation email:', emailError);
        }
      }
      
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
}

// Handler for POST /api/admin/create-shipping/:orderId
async function createShipping(req, res) {
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
}

module.exports = {
  checkPayments,
  paymentsCheck,
  confirmPayment,
  createShipping
};
