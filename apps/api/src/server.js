require('dotenv').config();
const app = require('./app');
const db = require('./config/database');
const startEscrowCron = require('./jobs/escrow.cron');

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`🚀 ResiSure API running on http://localhost:${PORT}`);
  startEscrowCron();
});