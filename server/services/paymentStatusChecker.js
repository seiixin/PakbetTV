const db = require('../config/db');
const dragonpayService = require('./dragonpayService');
const deliveryRouter = require('../routes/delivery');
const { sendOrderConfirmationEmail } = require('./emailService');

class PaymentStatusChecker {
  constructor() {
    this.isRunning = false;
    this.processedTransactions = new Set(); // Track processed transactions to avoid duplicates
  }

  /**
   * Check payment status for all pending orders
   * @returns {Object} Summary of the checking process
   */
  async checkPendingPayments() {
    if (this.isRunning) {
      console.log('Payment status check already running, skipping...');
      return { status: 'skipped', message: 'Already running' };
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('=== Starting payment status check ===');
      
      // Get all orders with payment awaiting confirmation that have reference numbers
      const [pendingOrders] = await db.query(`
        SELECT 
          o.order_id, 
          o.order_code, 
          o.order_status, 
          o.payment_status,
          o.user_id,
          o.total_price,
          p.payment_id,
          p.reference_number,
          p.status as payment_status_detail,
          p.created_at as payment_created,
          u.first_name,
          u.last_name,
          u.email
        FROM orders o
        JOIN payments p ON o.order_id = p.order_id
        JOIN users u ON o.user_id = u.user_id
        WHERE o.payment_status = 'awaiting_for_confirmation'
          AND p.reference_number IS NOT NULL
          AND p.reference_number != ''
          AND p.status = 'waiting_for_confirmation'
          AND p.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY p.created_at DESC
      `);

      console.log(`Found ${pendingOrders.length} orders with pending payments`);

      if (pendingOrders.length === 0) {
        return {
          status: 'completed',
          checked: 0,
          updated: 0,
          errors: 0,
          duration: Date.now() - startTime
        };
      }

      let checkedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      const results = [];

      // Process each pending order
      for (const order of pendingOrders) {
        try {
          // Skip if we already processed this transaction in this run
          if (this.processedTransactions.has(order.reference_number)) {
            console.log(`Skipping already processed transaction: ${order.reference_number}`);
            continue;
          }

          console.log(`Checking payment for order ${order.order_id} (${order.order_code}) - Reference: ${order.reference_number}`);
          
          // Query Dragonpay for payment status
          const inquiryResult = await dragonpayService.inquireTransaction(order.reference_number);
          checkedCount++;

          // Track this transaction as processed
          this.processedTransactions.add(order.reference_number);

          const result = {
            orderId: order.order_id,
            orderCode: order.order_code,
            referenceNumber: order.reference_number,
            previousStatus: order.payment_status,
            dragonpayStatus: inquiryResult.status,
            success: inquiryResult.success,
            message: inquiryResult.message,
            updated: false
          };

          // Check if status has changed and needs updating
          const shouldUpdate = this.shouldUpdateOrderStatus(order, inquiryResult);
          
          if (shouldUpdate) {
            await this.updateOrderPaymentStatus(order, inquiryResult);
            result.updated = true;
            result.newStatus = dragonpayService.mapStatusToOrderPaymentStatus(inquiryResult.status);
            updatedCount++;
            
            console.log(`✅ Updated order ${order.order_id}: ${inquiryResult.status} - ${inquiryResult.message}`);
          } else {
            console.log(`ℹ️  No update needed for order ${order.order_id}: Status ${inquiryResult.status}`);
          }

          results.push(result);

          // Add a small delay between requests to be respectful to Dragonpay API
          await this.delay(1000);

        } catch (error) {
          console.error(`Error checking payment for order ${order.order_id}:`, error.message);
          errorCount++;
          
          results.push({
            orderId: order.order_id,
            orderCode: order.order_code,
            referenceNumber: order.reference_number,
            error: error.message,
            updated: false
          });
        }
      }

      const summary = {
        status: 'completed',
        checked: checkedCount,
        updated: updatedCount,
        errors: errorCount,
        duration: Date.now() - startTime,
        results: results
      };

      console.log(`=== Payment status check completed ===`);
      console.log(`Checked: ${checkedCount}, Updated: ${updatedCount}, Errors: ${errorCount}`);
      console.log(`Duration: ${summary.duration}ms`);

      return summary;

    } catch (error) {
      console.error('Error in payment status checker:', error);
      return {
        status: 'error',
        message: error.message,
        duration: Date.now() - startTime
      };
    } finally {
      this.isRunning = false;
      // Clear processed transactions after a delay
      setTimeout(() => {
        this.processedTransactions.clear();
      }, 300000); // Clear after 5 minutes
    }
  }

  /**
   * Determine if order status should be updated based on Dragonpay response
   * @param {Object} order - Order data from database
   * @param {Object} inquiryResult - Result from Dragonpay inquiry
   * @returns {boolean} Whether to update the order
   */
  shouldUpdateOrderStatus(order, inquiryResult) {
    const currentPaymentStatus = order.payment_status;
    const dragonpayStatus = inquiryResult.status?.toUpperCase();

    // Only update if Dragonpay status is definitive (success or failure)
    if (dragonpayStatus === 'S' || dragonpayStatus === 'F') {
      return true;
    }

    // Don't update for pending or unknown statuses unless it's been too long
    const daysSincePayment = (Date.now() - new Date(order.payment_created).getTime()) / (1000 * 60 * 60 * 24);
    
    // After 3 days, consider unknown/pending as failed
    if (daysSincePayment > 3 && ['U', 'P'].includes(dragonpayStatus)) {
      console.log(`Payment for order ${order.order_id} has been pending for ${daysSincePayment.toFixed(1)} days, marking as timeout`);
      return true;
    }

    return false;
  }

  /**
   * Update order and payment status based on Dragonpay response
   * @param {Object} order - Order data from database
   * @param {Object} inquiryResult - Result from Dragonpay inquiry
   */
  async updateOrderPaymentStatus(order, inquiryResult) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const dragonpayStatus = inquiryResult.status?.toUpperCase();
      const orderStatus = dragonpayService.mapStatusToOrderStatus(dragonpayStatus);
      const paymentStatus = dragonpayService.mapStatusToOrderPaymentStatus(dragonpayStatus);
      const internalPaymentStatus = dragonpayService.mapStatusToInternal(dragonpayStatus);

      // Update orders table
      await connection.query(
        'UPDATE orders SET order_status = ?, payment_status = ?, updated_at = NOW() WHERE order_id = ?',
        [orderStatus, paymentStatus, order.order_id]
      );

      // Update payments table
      await connection.query(
        'UPDATE payments SET status = ?, updated_at = NOW() WHERE payment_id = ?',
        [internalPaymentStatus, order.payment_id]
      );

      // If payment is successful, create shipping order and send confirmation email
      if (dragonpayStatus === 'S') {
        try {
          // Empty the user's cart
          await connection.query('DELETE FROM cart WHERE user_id = ?', [order.user_id]);

          await connection.commit();

          // Create shipping order (don't include in transaction as it's external API)
          console.log(`Creating shipping order for successful payment: Order ${order.order_id}`);
          const shippingResult = await deliveryRouter.createShippingOrder(order.order_id);
          
          if (shippingResult && shippingResult.tracking_number) {
            // Update with tracking number
            await db.query(
              'UPDATE orders SET tracking_number = ? WHERE order_id = ?',
              [shippingResult.tracking_number, order.order_id]
            );
            console.log(`Tracking number assigned: ${shippingResult.tracking_number}`);
          }

          // Send order confirmation email
          await this.sendConfirmationEmail(order, shippingResult?.tracking_number);

        } catch (shippingError) {
          console.error(`Failed to create shipping for order ${order.order_id}:`, shippingError.message);
          // Don't fail the payment update if shipping fails
        }
      } else {
        await connection.commit();
      }

      console.log(`Order ${order.order_id} updated: ${orderStatus}/${paymentStatus}`);

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Send order confirmation email
   * @param {Object} order - Order data
   * @param {string} trackingNumber - Tracking number if available
   */
  async sendConfirmationEmail(order, trackingNumber = null) {
    try {
      // Get order items
      const [orderItems] = await db.query(
        'SELECT oi.*, p.name FROM order_items oi ' +
        'JOIN products p ON oi.product_id = p.product_id ' +
        'WHERE oi.order_id = ?',
        [order.order_id]
      );

      // Get shipping address
      const [shippingDetails] = await db.query(
        'SELECT address FROM shipping WHERE order_id = ?',
        [order.order_id]
      );

      const emailDetails = {
        orderNumber: order.order_code || order.order_id,
        customerName: `${order.first_name} ${order.last_name}`,
        customerEmail: order.email,
        items: orderItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: order.total_price,
        shippingAddress: shippingDetails.length > 0 ? shippingDetails[0].address : 'Address not available',
        paymentMethod: 'DragonPay',
        paymentReference: order.reference_number,
        trackingNumber: trackingNumber
      };

      await sendOrderConfirmationEmail(emailDetails);
      console.log(`Confirmation email sent for order ${order.order_id}`);

    } catch (emailError) {
      console.error(`Failed to send confirmation email for order ${order.order_id}:`, emailError.message);
    }
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to wait
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get checker status
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      processedCount: this.processedTransactions.size
    };
  }
}

module.exports = new PaymentStatusChecker(); 