const { Pool } = require('pg');

function sslOption() {
  const url = process.env.DATABASE_URL || '';
  const enabled = process.env.DB_SSL === 'true' || url.includes('sslmode=require');
  if (!enabled) return undefined;
  return { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
}

function poolConfig() {
  const ssl = sslOption();
  const max = parseInt(process.env.DB_POOL_MAX || '20', 10);
  const idleTimeoutMillis = parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10);

  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL, ssl, max, idleTimeoutMillis };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'resisure_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl,
    max,
    idleTimeoutMillis,
  };
}

const pool = new Pool(poolConfig());

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

if (process.env.NODE_ENV !== 'test') {
  pool.connect()
    .then((client) => {
      client.release();
      console.log('PostgreSQL connected');
    })
    .catch((err) => {
      console.error('Database connection failed:', err.message);
    });
}

module.exports = pool;
