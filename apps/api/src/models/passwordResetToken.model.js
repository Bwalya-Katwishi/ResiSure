const pool = require('../config/database');

const PasswordResetTokenModel = {
  async deleteUnusedForUser(userId) {
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL',
      [userId]
    );
  },

  async create({ userId, tokenHash, expiresAt }) {
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
  },

  async findValidByTokenHash(tokenHash) {
    const result = await pool.query(
      `SELECT prt.id, prt.user_id, u.email
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1
         AND prt.used_at IS NULL
         AND prt.expires_at > NOW()`,
      [tokenHash]
    );
    return result.rows[0] || null;
  },

  async markUsed(id) {
    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [id]);
  },

  async deleteUnusedForUserAfterUse(userId) {
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL',
      [userId]
    );
  },
};

module.exports = PasswordResetTokenModel;
