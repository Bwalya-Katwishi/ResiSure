require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function seed() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    console.error('Refusing to seed in production. Demo passwords would be created.');
    console.error('Set ALLOW_DEMO_SEED=true only for a private demo host.');
    process.exit(1);
  }

  try {
    console.log('🌱 Seeding database...');

    const password_hash = await bcrypt.hash('password123', 12);

    // Admin
    const adminResult = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone, accepted_terms_at)
       VALUES ($1, $2, $3, 'admin', $4, NOW())
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         password_hash = EXCLUDED.password_hash,
         accepted_terms_at = COALESCE(users.accepted_terms_at, NOW())
       RETURNING id`,
      ['ResiSure Admin', 'admin@resisure.zm', password_hash, '+260970000001']
    );
    const adminId = adminResult.rows[0].id;

    console.log('✅ Seed complete!');
    console.log('');
    console.log('Demo account (password: password123):');
    console.log('  Admin: admin@resisure.zm');
    console.log('');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
