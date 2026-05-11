const pool = require('../config/database');

const UserModel = {

  // Find a user by email — used during login
  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  // Find a user by ID — used in auth middleware
  async findById(id) {
    const result = await pool.query(
      'SELECT id, full_name, email, role, phone, is_verified, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  // Create a new user — used during registration
  async create({ full_name, email, password_hash, role, phone }) {
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, role, phone, is_verified, created_at`,
      [full_name, email, password_hash, role, phone]
    );
    return result.rows[0];
  },

};

module.exports = UserModel;