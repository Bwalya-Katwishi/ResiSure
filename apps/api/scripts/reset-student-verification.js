#!/usr/bin/env node
/**
 * Clear student verification documents and reset to pending (keeps login/password).
 * Usage: node scripts/reset-student-verification.js email1@example.com email2@example.com
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/config/database');

const emails = process.argv.slice(2).map((e) => e.trim().toLowerCase()).filter(Boolean);

async function main() {
  if (!emails.length) {
    console.error('Usage: node scripts/reset-student-verification.js <email> [email...]');
    process.exit(1);
  }

  for (const email of emails) {
    const userRes = await pool.query(
      `SELECT u.id, u.email, u.role, sp.id AS profile_id
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    const row = userRes.rows[0];
    if (!row) {
      console.warn(`Skip: no user for ${email}`);
      continue;
    }
    if (row.role !== 'student') {
      console.warn(`Skip: ${email} is role "${row.role}", not student`);
      continue;
    }
    if (!row.profile_id) {
      await pool.query('INSERT INTO student_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [row.id]);
    }

    const upd = await pool.query(
      `UPDATE student_profiles SET
        nrc_number = NULL,
        nrc_doc_url = NULL,
        university_slip_url = NULL,
        verification_status = 'pending',
        verified_at = NULL,
        verified_by = NULL,
        verification_expires_at = NULL,
        rejection_reason = NULL,
        suspended_at = NULL,
        suspended_by = NULL
       WHERE user_id = $1
       RETURNING verification_status`,
      [row.id]
    );

    console.log(`Reset: ${email} → verification_status=${upd.rows[0]?.verification_status || 'pending'}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
