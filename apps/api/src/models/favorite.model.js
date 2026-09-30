const pool = require('../config/database');

const FavoriteModel = {
  async add(userId, propertyId) {
    const result = await pool.query(
      `INSERT INTO favorites (user_id, property_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, property_id) DO NOTHING
       RETURNING *`,
      [userId, propertyId]
    );
    return result.rows[0] || null;
  },

  async remove(userId, propertyId) {
    const result = await pool.query(
      `DELETE FROM favorites
       WHERE user_id = $1 AND property_id = $2
       RETURNING id`,
      [userId, propertyId]
    );
    return result.rows[0] || null;
  },

  async listByUser(userId) {
    const result = await pool.query(
      `SELECT
        p.*,
        'ZMW' AS currency,
        TRUE AS is_favorite,
        u.full_name AS landlord_name,
        lp.verification_status AS landlord_verification_status,
        COALESCE(
          json_agg(
            json_build_object('id', pi.id, 'image_url', pi.image_url, 'is_primary', pi.is_primary)
            ORDER BY pi.is_primary DESC, pi.created_at ASC
          ) FILTER (WHERE pi.image_url IS NOT NULL),
          '[]'
        ) AS images
       FROM favorites f
       JOIN properties p ON p.id = f.property_id
       JOIN landlord_profiles lp ON p.landlord_id = lp.id
       JOIN users u ON lp.user_id = u.id
       LEFT JOIN property_images pi ON pi.property_id = p.id
       WHERE f.user_id = $1 AND p.status <> 'unlisted'
       GROUP BY p.id, u.full_name, lp.verification_status, f.created_at
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return result.rows;
  },
};

module.exports = FavoriteModel;
