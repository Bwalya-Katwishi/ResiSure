require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    const password_hash = await bcrypt.hash('password123', 12);

    // Admin
    const adminResult = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, 'admin', $4)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['ResiSure Admin', 'admin@resisure.zm', password_hash, '+260970000001']
    );
    const adminId = adminResult.rows[0].id;

    // Student
    const studentResult = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, 'student', $4)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['Bwalya Katwishi', 'student@resisure.zm', password_hash, '+260970000002']
    );

    // Landlord
    const landlordResult = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, 'landlord', $4)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['John Mwamba', 'landlord@resisure.zm', password_hash, '+260970000003']
    );
    const landlordUserId = landlordResult.rows[0].id;

    let landlordProfile = await pool.query(
      'SELECT id FROM landlord_profiles WHERE user_id = $1',
      [landlordUserId]
    );

    if (landlordProfile.rows.length === 0) {
      landlordProfile = await pool.query(
        `INSERT INTO landlord_profiles (user_id, verification_status, verified_at)
         VALUES ($1, 'verified', NOW()) RETURNING id`,
        [landlordUserId]
      );
    } else {
      await pool.query(
        `UPDATE landlord_profiles SET verification_status = 'verified', verified_at = NOW()
         WHERE user_id = $1`,
        [landlordUserId]
      );
    }

    const landlordProfileId = landlordProfile.rows[0].id;

    const existingProps = await pool.query(
      'SELECT COUNT(*) FROM properties WHERE landlord_id = $1',
      [landlordProfileId]
    );

    if (parseInt(existingProps.rows[0].count, 10) === 0) {
      await pool.query(
        `INSERT INTO properties (landlord_id, title, description, address, area, rent_per_month, total_rooms, available_rooms)
         VALUES
         ($1, 'Spacious Self-Contained Room — Chelstone', 'Modern self-contained room near UNZA Main Campus. Includes water, electricity, and WiFi. 5-minute walk to campus gate.', 'Plot 12, Chilimbulu Road, Chelstone, Lusaka', 'Chelstone', 1500.00, 1, 1),
         ($1, 'Shared Room — Ridgeway Campus Area', 'Affordable shared accommodation for UNZA Ridgeway students. Quiet neighbourhood, secure compound.', 'House 8, Libala Stage 2, Lusaka', 'Libala', 800.00, 2, 2),
         ($1, 'Premium Studio — Kalingalinga', 'Fully furnished studio apartment with ensuite bathroom and kitchenette. Ideal for postgraduates.', 'Block C, Kalingalinga, Lusaka', 'Kalingalinga', 2500.00, 1, 1)`,
        [landlordProfileId]
      );
    }

    console.log('✅ Seed complete!');
    console.log('');
    console.log('Demo accounts (password: password123):');
    console.log('  Admin:    admin@resisure.zm');
    console.log('  Student:  student@resisure.zm');
    console.log('  Landlord: landlord@resisure.zm');
    console.log('');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
