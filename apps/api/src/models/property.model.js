const pool = require('../config/database');

const PropertyModel = {

  async create({ landlord_id, title, description, address, area, rent_per_month, total_rooms }) {
    const result = await pool.query(
      `INSERT INTO properties 
        (landlord_id, title, description, address, area, rent_per_month, total_rooms, available_rooms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       RETURNING *`,
      [landlord_id, title, description, address, area, rent_per_month, total_rooms]
    );
    return result.rows[0];
  },

  async findAll({ min_price, max_price, area, verified, available }) {
    let query = `
      SELECT 
        p.*,
        u.full_name AS landlord_name,
        u.phone AS landlord_phone,
        lp.verification_status,
        COALESCE(
          json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), 
          '[]'
        ) AS images
      FROM properties p
      JOIN landlord_profiles lp ON p.landlord_id = lp.id
      JOIN users u ON lp.user_id = u.id
      LEFT JOIN property_images pi ON pi.property_id = p.id
      WHERE 1=1
    `;

    const params = [];
    let i = 1;

    if (min_price) {
      query += ` AND p.rent_per_month >= $${i++}`;
      params.push(min_price);
    }

    if (max_price) {
      query += ` AND p.rent_per_month <= $${i++}`;
      params.push(max_price);
    }

    if (area) {
      query += ` AND LOWER(p.area) LIKE LOWER($${i++})`;
      params.push(`%${area}%`);
    }

    if (verified === 'true') {
      query += ` AND lp.verification_status = 'verified'`;
    }

    if (available === 'true') {
      query += ` AND p.available_rooms > 0 AND p.status = 'available'`;
    }

    query += ` GROUP BY p.id, u.full_name, u.phone, lp.verification_status`;
    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT 
        p.*,
        u.full_name AS landlord_name,
        u.phone AS landlord_phone,
        lp.verification_status,
        COALESCE(
          json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL),
          '[]'
        ) AS images
       FROM properties p
       JOIN landlord_profiles lp ON p.landlord_id = lp.id
       JOIN users u ON lp.user_id = u.id
       LEFT JOIN property_images pi ON pi.property_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, u.full_name, u.phone, lp.verification_status`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findByLandlordId(landlord_id) {
    const result = await pool.query(
      `SELECT p.*, 
        COALESCE(
          json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL),
          '[]'
        ) AS images
       FROM properties p
       LEFT JOIN property_images pi ON pi.property_id = p.id
       WHERE p.landlord_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [landlord_id]
    );
    return result.rows;
  },

  async update(id, { title, description, address, area, rent_per_month, total_rooms, available_rooms, status }) {
    const result = await pool.query(
      `UPDATE properties SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        address = COALESCE($3, address),
        area = COALESCE($4, area),
        rent_per_month = COALESCE($5, rent_per_month),
        total_rooms = COALESCE($6, total_rooms),
        available_rooms = COALESCE($7, available_rooms),
        status = COALESCE($8, status),
        updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [title, description, address, area, rent_per_month, total_rooms, available_rooms, status, id]
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    await pool.query('DELETE FROM properties WHERE id = $1', [id]);
  },

  async getLandlordProfile(user_id) {
    const result = await pool.query(
      'SELECT * FROM landlord_profiles WHERE user_id = $1',
      [user_id]
    );
    return result.rows[0] || null;
  },

};

module.exports = PropertyModel;