const pool = require('../config/database');

const StudentProfileModel = {
  async createForUser(userId) {
    await pool.query('INSERT INTO student_profiles (user_id) VALUES ($1)', [userId]);
  },

  async getVerificationStatus(userId) {
    const result = await pool.query(
      'SELECT verification_status FROM student_profiles WHERE user_id = $1',
      [userId]
    );
    return result.rows[0]?.verification_status || null;
  },
};

module.exports = StudentProfileModel;
