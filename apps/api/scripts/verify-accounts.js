const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/config/database');

async function verify() {
  const { rows } = await pool.query(
    `SELECT email, role, full_name,
            CASE WHEN password_hash IS NOT NULL AND length(password_hash::text) > 0
                 THEN 'present' ELSE 'missing' END AS password
     FROM users
     ORDER BY role, email`
  );
  console.table(rows);
  console.log('Total users:', rows.length);
  await pool.end();
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
