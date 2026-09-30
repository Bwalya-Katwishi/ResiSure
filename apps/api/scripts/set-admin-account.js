#!/usr/bin/env node
/**
 * Set or update the production admin account.
 * Usage: node scripts/set-admin-account.js [email] [password]
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

const ADMIN_EMAIL = (process.argv[2] || 'resisure.zm@gmail.com').trim().toLowerCase();
const ADMIN_PASSWORD = process.argv[3] || 'password123';
const ADMIN_NAME = 'ResiSure Admin';

async function main() {
  if (ADMIN_PASSWORD.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id, email, role FROM users WHERE LOWER(email) = LOWER($1)',
      [ADMIN_EMAIL]
    );
    const currentAdmin = await client.query(
      "SELECT id, email FROM users WHERE role = 'admin'"
    );

    let adminId;

    if (existing.rows[0]) {
      adminId = existing.rows[0].id;
      await client.query(
        `UPDATE users SET
          full_name = $1,
          password_hash = $2,
          role = 'admin',
          is_verified = true,
          account_status = 'active',
          updated_at = NOW()
         WHERE id = $3`,
        [ADMIN_NAME, passwordHash, adminId]
      );
      console.log(`Updated existing account ${ADMIN_EMAIL} to admin.`);
    } else {
      const oldAdmin = currentAdmin.rows.find(
        (row) => row.email.toLowerCase() !== ADMIN_EMAIL
      );
      if (oldAdmin) {
        await client.query(
          `UPDATE users SET
            email = $1,
            full_name = $2,
            password_hash = $3,
            is_verified = true,
            account_status = 'active',
            updated_at = NOW()
           WHERE id = $4`,
          [ADMIN_EMAIL, ADMIN_NAME, passwordHash, oldAdmin.id]
        );
        adminId = oldAdmin.id;
        console.log(`Converted admin ${oldAdmin.email} -> ${ADMIN_EMAIL}.`);
      } else {
        const inserted = await client.query(
          `INSERT INTO users (full_name, email, password_hash, role, is_verified, account_status, accepted_terms_at)
           VALUES ($1, $2, $3, 'admin', true, 'active', NOW())
           RETURNING id`,
          [ADMIN_NAME, ADMIN_EMAIL, passwordHash]
        );
        adminId = inserted.rows[0].id;
        console.log(`Created new admin ${ADMIN_EMAIL}.`);
      }
    }

    await client.query(
      "UPDATE users SET role = 'student', updated_at = NOW() WHERE role = 'admin' AND id != $1",
      [adminId]
    );

    await client.query('COMMIT');

    const verify = await pool.query(
      'SELECT email, role, is_verified, account_status FROM users WHERE id = $1',
      [adminId]
    );
    console.log('Admin ready:', verify.rows[0]);
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
