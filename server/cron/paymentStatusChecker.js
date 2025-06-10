const cron = require('node-cron');
const paymentStatusChecker = require('../services/paymentStatusChecker');

class PaymentStatusCron {
  constructor() {
    this.cronJob = null;
    this.isScheduled = false;
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      lastRun: null,
      lastSuccess: null,
      totalOrdersChecked: 0,
      totalOrdersUpdated: 0
    };
  }

  /**
   * Start the Dragonpay Transaction Status Query cron job
   * Runs every 15 minutes during business hours for faster payment confirmation
   */
  start() {
    if (this.isScheduled) {
      console.log('💼 Dragonpay Transaction Status checker cron job is already scheduled');
      return;
    }

    // Schedule to run every 15 minutes for faster payment processing
    // This ensures customers get their orders processed quickly after payment
    this.cronJob = cron.schedule('*/15 * * * *', async () => {
      await this.executePaymentCheck();
    }, {
      scheduled: false,
      timezone: "Asia/Manila" // Adjust timezone as needed
    });

    this.cronJob.start();
    this.isScheduled = true;
    
    console.log('✅ Dragonpay Transaction Status checker cron job started');
    console.log('📅 Schedule: Every 15 minutes for optimal payment processing');
    console.log('🌏 Timezone: Asia/Manila');
    console.log('🔍 Will check Dragonpay Transaction Status Query API for pending payments');
  }

  /**
   * Execute the payment status check with comprehensive logging
   */
  async executePaymentCheck() {
    this.stats.totalRuns++;
    this.stats.lastRun = new Date();
    
    try {
      console.log('🔍 Starting scheduled Dragonpay Transaction Status Query check...');
      console.log(`📊 Run #${this.stats.totalRuns} at ${this.stats.lastRun.toISOString()}`);
      
      const result = await paymentStatusChecker.checkPendingPayments();
      
      // Update statistics
      this.stats.totalOrdersChecked += result.checked || 0;
      this.stats.totalOrdersUpdated += result.updated || 0;
      
      if (result.status === 'completed') {
        this.stats.successfulRuns++;
        this.stats.lastSuccess = new Date();
        
        console.log(`✅ Dragonpay check completed successfully:`);
        console.log(`   📋 Orders checked: ${result.checked}`);
        console.log(`   🔄 Orders updated: ${result.updated}`);
        console.log(`   ❌ Errors: ${result.errors || 0}`);
        console.log(`   ⏭️  Skipped: ${result.skipped || 0}`);
        console.log(`   🔄 Retries: ${result.retries || 0}`);
        console.log(`   ⏱️  Duration: ${result.duration}ms`);
        
        // Log transaction completions
        if (result.updated > 0) {
          console.log(`🎉 ${result.updated} order(s) had status changes - transaction flows may have been executed`);
        }
        
      } else if (result.status === 'skipped') {
        console.log('⏭️  Dragonpay check skipped (already running)');
      } else {
        this.stats.failedRuns++;
        console.log(`❌ Dragonpay check failed: ${result.message}`);
      }
      
      // Log overall statistics periodically
      if (this.stats.totalRuns % 10 === 0) {
        this.logStatistics();
      }
      
    } catch (error) {
      this.stats.failedRuns++;
      console.error('❌ Error in Dragonpay Transaction Status cron job:', error.message);
    }
  }

  /**
   * Log comprehensive statistics
   */
  logStatistics() {
    console.log('\n📊 === Dragonpay Transaction Status Checker Statistics ===');
    console.log(`🏃 Total runs: ${this.stats.totalRuns}`);
    console.log(`✅ Successful runs: ${this.stats.successfulRuns}`);
    console.log(`❌ Failed runs: ${this.stats.failedRuns}`);
    console.log(`📋 Total orders checked: ${this.stats.totalOrdersChecked}`);
    console.log(`🔄 Total orders updated: ${this.stats.totalOrdersUpdated}`);
    console.log(`📅 Last run: ${this.stats.lastRun ? this.stats.lastRun.toISOString() : 'Never'}`);
    console.log(`✅ Last success: ${this.stats.lastSuccess ? this.stats.lastSuccess.toISOString() : 'Never'}`);
    
    if (this.stats.totalRuns > 0) {
      const successRate = ((this.stats.successfulRuns / this.stats.totalRuns) * 100).toFixed(1);
      console.log(`📈 Success rate: ${successRate}%`);
    }
    console.log('================================================\n');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isScheduled = false;
      console.log('❌ Dragonpay Transaction Status checker cron job stopped');
      this.logStatistics();
    }
  }

  /**
   * Get the status of the cron job with enhanced details
   */
  getStatus() {
    return {
      scheduled: this.isScheduled,
      checkerStatus: paymentStatusChecker.getStatus(),
      stats: this.stats,
      schedule: '*/15 * * * *', // Every 15 minutes
      timezone: 'Asia/Manila',
      description: 'Dragonpay Transaction Status Query API checker'
    };
  }

  /**
   * Run payment check manually (for testing and debugging)
   */
  async runManual() {
    console.log('🔧 Running manual Dragonpay Transaction Status check...');
    try {
      const result = await paymentStatusChecker.checkPendingPayments();
      console.log('📋 Manual Dragonpay check result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in manual Dragonpay check:', error);
      throw error;
    }
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      lastRun: null,
      lastSuccess: null,
      totalOrdersChecked: 0,
      totalOrdersUpdated: 0
    };
    console.log('📊 Statistics reset');
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
  runManualPaymentCheck: () => paymentStatusCronInstance.runManual(),
  resetPaymentStatusStats: () => paymentStatusCronInstance.resetStats()
}; 