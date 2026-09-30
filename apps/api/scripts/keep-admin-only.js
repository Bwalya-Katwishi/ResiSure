#!/usr/bin/env node
/**
 * Remove all accounts except the production admin.
 * Usage: node scripts/keep-admin-only.js [admin-email]
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/config/database');

const ADMIN_EMAIL = (process.argv[2] || 'resisure.zm@gmail.com').trim().toLowerCase();

async function main() {
  const client = await pool.connect();
  try {
    const { rows: adminRows } = await client.query(
      'SELECT id, email, role FROM users WHERE LOWER(email) = LOWER($1)',
      [ADMIN_EMAIL]
    );
    if (!adminRows[0]) {
      throw new Error(`Admin account not found: ${ADMIN_EMAIL}`);
    }
    if (adminRows[0].role !== 'admin') {
      throw new Error(`${ADMIN_EMAIL} is not an admin (role: ${adminRows[0].role})`);
    }

    const adminId = adminRows[0].id;
    const { rows: targets } = await client.query(
      'SELECT id, email, role FROM users WHERE id != $1 ORDER BY role, email',
      [adminId]
    );

    if (!targets.length) {
      console.log(`Only admin remains: ${ADMIN_EMAIL}`);
      return;
    }

    console.log(`Removing ${targets.length} account(s)...`);
    targets.forEach((row) => console.log(`  - ${row.role}: ${row.email}`));

    await client.query('BEGIN');
    await client.query('DELETE FROM content_reports');
    await client.query('DELETE FROM risk_flags');
    await client.query('DELETE FROM disputes');
    await client.query('DELETE FROM booking_audit_log');
    await client.query('DELETE FROM escrow_transactions');
    await client.query('DELETE FROM bookings');
    await client.query('DELETE FROM favorites');
    await client.query('DELETE FROM property_images WHERE property_id IN (SELECT id FROM properties WHERE landlord_id != $1)', [adminId]);
    await client.query('DELETE FROM properties WHERE landlord_id != $1', [adminId]);
    await client.query('DELETE FROM notifications WHERE user_id != $1', [adminId]);
    await client.query('DELETE FROM password_reset_tokens WHERE user_id != $1', [adminId]);
    await client.query('DELETE FROM users WHERE id != $1', [adminId]);
    await client.query('COMMIT');

    const { rows: remaining } = await client.query('SELECT email, role FROM users ORDER BY email');
    console.log('Remaining accounts:', remaining);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
