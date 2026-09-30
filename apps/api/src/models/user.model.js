const pool = require('../config/database');

const UserModel = {

  // Find a user by email — used during login (case-insensitive)
  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [String(email || '').trim()]
    );
    return result.rows[0] || null;
  },

  // Find a user by ID — used in auth middleware
  async findById(id) {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.phone, u.is_verified, u.profile_photo_url, u.created_at,
              u.account_status,
              lp.verification_status AS landlord_verification_status,
              lp.nrc_number AS landlord_nrc_number,
              sp.verification_status AS student_verification_status,
              sp.nrc_number AS student_nrc_number
       FROM users u
       LEFT JOIN landlord_profiles lp ON lp.user_id = u.id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );
    const user = result.rows[0] || null;
    if (!user) return null;
    if (user.role === 'landlord') {
      user.verification_status = user.landlord_verification_status || 'pending';
    } else if (user.role === 'student') {
      user.verification_status = user.student_verification_status || 'pending';
    }
    return user;
  },

  // Create a new user — used during registration
  async create({ full_name, email, password_hash, role, phone, accepted_terms_at = null }) {
    try {
      const result = await pool.query(
        `INSERT INTO users (full_name, email, password_hash, role, phone, accepted_terms_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, full_name, email, role, phone, is_verified, accepted_terms_at, created_at`,
        [full_name, email, password_hash, role, phone, accepted_terms_at]
      );
      return result.rows[0];
    } catch (err) {
      // Fallback if migration 003 has not been applied yet
      if (err.message && err.message.includes('accepted_terms_at')) {
        const result = await pool.query(
          `INSERT INTO users (full_name, email, password_hash, role, phone)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, full_name, email, role, phone, is_verified, created_at`,
          [full_name, email, password_hash, role, phone]
        );
        return result.rows[0];
      }
      throw err;
    }
  },

  async updateProfile(id, { full_name, phone, profile_photo_url }) {
    const result = await pool.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        phone = CASE WHEN $3 THEN $2 ELSE phone END,
        profile_photo_url = COALESCE($4, profile_photo_url),
        updated_at = NOW()
       WHERE id = $5
       RETURNING id, full_name, email, role, phone, is_verified, profile_photo_url, created_at`,
      [
        full_name ?? null,
        phone === undefined ? null : phone,
        phone !== undefined,
        profile_photo_url ?? null,
        id,
      ]
    );
    return result.rows[0] || null;
  },

};

module.exports = UserModel;
