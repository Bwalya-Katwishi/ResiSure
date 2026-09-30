const pool = require('../config/database');
const MessagingService = require('./messaging');
const { NOTIFICATION_DEDUPE_MINUTES } = require('../config/notificationPolicy');

async function deliver(userId, type, message, link) {
  try {
    const user = await pool.query(
      'SELECT email, phone, full_name FROM users WHERE id = $1',
      [userId]
    );
    await MessagingService.dispatch({
      user: user.rows[0],
      type,
      message,
      link,
    });
  } catch (err) {
    console.error('Outbound message failed:', err.message);
  }
}

async function isDuplicate({ user_id, type, message, link }) {
  const result = await pool.query(
    `SELECT id FROM notifications
     WHERE user_id = $1
       AND type = $2
       AND message = $3
       AND (link IS NOT DISTINCT FROM $4)
       AND created_at > NOW() - ($5::text || ' minutes')::interval
     LIMIT 1`,
    [user_id, type, message, link || null, String(NOTIFICATION_DEDUPE_MINUTES)]
  );
  return result.rows.length > 0;
}

const NotificationService = {
  async create({ user_id, type, message, link, skipDedupe = false }) {
    if (!user_id || !type || !message) return null;

    if (!skipDedupe) {
      const duplicate = await isDuplicate({ user_id, type, message, link });
      if (duplicate) return null;
    }

    try {
      const result = await pool.query(
        `INSERT INTO notifications (user_id, type, message, link)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [user_id, type, message, link || null]
      );
      deliver(user_id, type, message, link);
      return result.rows[0];
    } catch (err) {
      if (err.code === '42703') {
        try {
          const fallback = await pool.query(
            `INSERT INTO notifications (user_id, type, message)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [user_id, type, message]
          );
          deliver(user_id, type, message, link);
          return fallback.rows[0];
        } catch (fallbackErr) {
          console.error('Failed to create notification:', fallbackErr.message);
          return null;
        }
      }
      console.error('Failed to create notification:', err.message);
      return null;
    }
  },

  async notifyAdmins({ type, message, link }) {
    try {
      const admins = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
      await Promise.all(
        admins.rows.map((admin) =>
          this.create({ user_id: admin.id, type, message, link })
        )
      );
    } catch (err) {
      console.error('Failed to notify admins:', err.message);
    }
  },

  async listForUser(user_id) {
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [user_id]
    );
    return result.rows;
  },

  async unreadCount(user_id) {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [user_id]
    );
    return result.rows[0].count;
  },

  async markRead(id, user_id) {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, user_id]
    );
    return result.rows[0] || null;
  },

  async markAllRead(user_id) {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [user_id]
    );
  },
};

module.exports = NotificationService;
