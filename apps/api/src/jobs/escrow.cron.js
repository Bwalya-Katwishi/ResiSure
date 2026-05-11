const cron = require('node-cron');
const EscrowService = require('../services/escrow.service');

const startEscrowCron = () => {
  // Runs every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ Running escrow auto-release check...');
    try {
      await EscrowService.autoReleaseExpired();
    } catch (err) {
      console.error('❌ Escrow cron job failed:', err.message);
    }
  });

  console.log('✅ Escrow cron job started — checking every 5 minutes');
};

module.exports = startEscrowCron;