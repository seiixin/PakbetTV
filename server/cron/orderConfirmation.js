const cron = require('node-cron');
const axios = require('axios');

// Run every day at midnight
const scheduleOrderConfirmation = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Running order auto-completion cron job...');
      
      const serverUrl = process.env.SERVER_URL || 'https://michaeldemesa.com';
      const response = await axios.post(
        `${serverUrl}/api/orders/auto-complete`
      );
      
      console.log('Auto-completion result:', response.data);
    } catch (error) {
      console.error('Error in order auto-completion cron job:', error);
    }
  });
};

module.exports = { scheduleOrderConfirmation }; 