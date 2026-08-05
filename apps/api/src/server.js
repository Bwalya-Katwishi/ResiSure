require('dotenv').config();
const app = require('./app');
const startEscrowCron = require('./jobs/escrow.cron');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 ResiSure API running on http://localhost:${PORT}`);
  startEscrowCron();
});
