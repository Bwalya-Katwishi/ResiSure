const pool = require('../config/database');

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'jwt',
  'authorization',
  'secret',
  'api_key',
  'apiKey',
  'cloudinary_api_secret',
  'payer_phone',
  'phone',
]);

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return null;
  const clean = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase()) || SENSITIVE_KEYS.has(key)) continue;
    if (typeof value === 'string' && value.length > 500) {
      clean[key] = `${value.slice(0, 500)}…`;
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

const AuditService = {
  async log({ actor_id = null, action, entity_type, entity_id = null, metadata = null }) {
    if (!action || !entity_type) return null;
    try {
      const result = await pool.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [actor_id, action, entity_type, entity_id, sanitizeMetadata(metadata)]
      );
      return result.rows[0];
    } catch (err) {
      console.error('Failed to write audit log:', err.message);
      return null;
    }
  },

  async list({ action, entity_type, actor_id, limit = 50, offset = 0 } = {}) {
    const params = [];
    let i = 1;
    let where = 'WHERE 1=1';
    if (action) {
      where += ` AND action = $${i++}`;
      params.push(action);
    }
    if (entity_type) {
      where += ` AND entity_type = $${i++}`;
      params.push(entity_type);
    }
    if (actor_id) {
      where += ` AND actor_id = $${i++}`;
      params.push(actor_id);
    }
    params.push(Math.min(Number(limit) || 50, 200));
    params.push(Number(offset) || 0);

    const result = await pool.query(
      `SELECT a.*, u.full_name AS actor_name, u.email AS actor_email, u.role AS actor_role
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${i++} OFFSET $${i}`,
      params
    );
    return result.rows;
  },
};

module.exports = AuditService;
