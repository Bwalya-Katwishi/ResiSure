const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'resisure_db',
  user: 'postgres',
  password: 'Y@ng@2003*',
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:');
    console.error('   Message:', err.message);
  } else {
    console.log('✅ PostgreSQL connected successfully');
    release();
  }
});

module.exports = pool;