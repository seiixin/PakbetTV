const cron = require('node-cron');
const paymentStatusChecker = require('../services/paymentStatusChecker');

class PaymentStatusCron {
  constructor() {
    this.cronJob = null;
    this.isScheduled = false;
  }

  /**
   * Start the payment status checking cron job
   * Runs every 30 minutes during business hours (9 AM to 9 PM)
   */
  start() {
    if (this.isScheduled) {
      console.log('Payment status checker cron job is already scheduled');
      return;
    }

    // Schedule to run every 30 minutes between 9 AM and 9 PM
    this.cronJob = cron.schedule('*/30 * * * *', async () => {
      try {
        console.log('🔍 Running scheduled payment status check...');
        const result = await paymentStatusChecker.checkPendingPayments();
        
        if (result.status === 'completed') {
          console.log(`✅ Payment check completed: ${result.checked} checked, ${result.updated} updated, ${result.errors} errors`);
        } else if (result.status === 'skipped') {
          console.log('⏭️  Payment check skipped (already running)');
        } else {
          console.log(`❌ Payment check failed: ${result.message}`);
        }
      } catch (error) {
        console.error('❌ Error in payment status cron job:', error.message);
      }
    }, {
      scheduled: false,
      timezone: "Asia/Manila" // Adjust timezone as needed
    });

    this.cronJob.start();
    this.isScheduled = true;
    
    console.log('✅ Payment status checker cron job started - runs every 30 minutes from 9 AM to 9 PM');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isScheduled = false;
      console.log('❌ Payment status checker cron job stopped');
    }
  }

  /**
   * Get the status of the cron job
   */
  getStatus() {
    return {
      scheduled: this.isScheduled,
      checkerStatus: paymentStatusChecker.getStatus()
    };
  }

  /**
   * Run payment check manually (for testing)
   */
  async runManual() {
    console.log('🔧 Running manual payment status check...');
    try {
      const result = await paymentStatusChecker.checkPendingPayments();
      console.log('Manual payment check result:', result);
      return result;
    } catch (error) {
      console.error('Error in manual payment check:', error);
      throw error;
    }
  }
}

// Export both the class and a singleton instance
const paymentStatusCronInstance = new PaymentStatusCron();

module.exports = {
  PaymentStatusCron,
  paymentStatusCron: paymentStatusCronInstance,
  startPaymentStatusChecker: () => paymentStatusCronInstance.start(),
  stopPaymentStatusChecker: () => paymentStatusCronInstance.stop(),
  getPaymentStatusCheckerStatus: () => paymentStatusCronInstance.getStatus(),
  runManualPaymentCheck: () => paymentStatusCronInstance.runManual()
}; 