const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/config/database');

const KEEP_EMAILS = [
  'admin@resisure.zm',
  'andreatheu2003@yahoo.co.uk',
  'bwalya.katwishi@cs.unza.zm',
  'bwalyakatwishi@gmail.com',
];

async function cleanupTestAccounts() {
  const client = await pool.connect();
  try {
    const { rows: keepRows } = await client.query(
      `SELECT id, email, role, full_name FROM users WHERE email = ANY($1::text[])`,
      [KEEP_EMAILS]
    );
    const keepIds = keepRows.map((row) => row.id);
    const missing = KEEP_EMAILS.filter((email) => !keepRows.some((row) => row.email === email));
    if (missing.length) {
      throw new Error(`Required account(s) not found: ${missing.join(', ')}`);
    }

    const { rows: targets } = await client.query(
      `SELECT id, email, role, full_name
       FROM users
       WHERE id <> ALL($1::uuid[])
       ORDER BY role, email`,
      [keepIds]
    );

    if (!targets.length) {
      console.log('No extra accounts to remove.');
      console.log('Kept:', KEEP_EMAILS.join(', '));
      return;
    }

    console.log(`Removing ${targets.length} account(s)...`);
    targets.forEach((row) => console.log(`  - ${row.role}: ${row.email} (${row.full_name})`));

    await client.query('BEGIN');

    // Clear transactional data tied to accounts being removed.
    await client.query('DELETE FROM content_reports');
    await client.query('DELETE FROM risk_flags');
    await client.query('DELETE FROM disputes');
    await client.query('DELETE FROM booking_audit_log');
    await client.query('DELETE FROM escrow_transactions');
    await client.query('DELETE FROM bookings');
    await client.query('DELETE FROM notifications WHERE user_id <> ALL($1::uuid[])', [keepIds]);

    await client.query('DELETE FROM users WHERE id <> ALL($1::uuid[])', [keepIds]);

    await client.query('COMMIT');
    console.log('✅ Extra accounts removed.');
    console.log('Kept:', KEEP_EMAILS.join(', '));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Cleanup failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupTestAccounts();
