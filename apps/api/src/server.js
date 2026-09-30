require('dotenv').config();
const { validateEnv, productionWarnings } = require('./config/env');

try {
  validateEnv();
  productionWarnings().forEach((msg) => console.warn(`Production notice: ${msg}`));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const app = require('./app');
const pool = require('./config/database');
const startEscrowCron = require('./jobs/escrow.cron');

const PORT = parseInt(process.env.PORT || '5000', 10);
const server = app.listen(PORT, () => {
  console.log(`ResiSure API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  startEscrowCron();
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection:', err?.message || err);
});
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err?.message || err);
  shutdown('uncaughtException');
});
