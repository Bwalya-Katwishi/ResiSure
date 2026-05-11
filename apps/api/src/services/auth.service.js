const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'resisure_super_secret_change_this_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const AuthService = {

  async register({ full_name, email, password, role, phone }) {
    // 1. Check if email already exists
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      throw { status: 409, message: 'An account with this email already exists' };
    }

    // 2. Validate role — students and landlords can self-register, not admins
    if (!['student', 'landlord'].includes(role)) {
      throw { status: 400, message: 'Invalid role. Must be student or landlord' };
    }

    // 3. Hash the password — never store plain text
    const password_hash = await bcrypt.hash(password, 12);

    // 4. Create the user
    const user = await UserModel.create({ full_name, email, password_hash, role, phone });

    // 5. If landlord, create their profile record automatically
    if (role === 'landlord') {
      await pool.query(
        'INSERT INTO landlord_profiles (user_id) VALUES ($1)',
        [user.id]
      );
    }

    // 6. Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return { user, token };
  },

  async login({ email, password }) {
    // 1. Find the user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw { status: 401, message: 'Invalid email or password' };
    }

    // 2. Compare password with stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw { status: 401, message: 'Invalid email or password' };
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 4. Return user without password hash
    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token };
  },

};

module.exports = AuthService;