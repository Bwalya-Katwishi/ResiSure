const pool = require('../config/database');

const PROPERTY_TYPES = ['room', 'shared', 'studio', 'apartment'];

async function attachFavoriteFlags(properties, userId) {
  if (!properties?.length) return properties;
  if (!userId) {
    properties.forEach((property) => {
      property.is_favorite = false;
    });
    return properties;
  }
  const ids = properties.map((property) => property.id);
  const result = await pool.query(
    `SELECT property_id FROM favorites WHERE user_id = $1 AND property_id = ANY($2::uuid[])`,
    [userId, ids]
  );
  const saved = new Set(result.rows.map((row) => row.property_id));
  properties.forEach((property) => {
    property.is_favorite = saved.has(property.id);
  });
  return properties;
}
const LISTING_SELECT = `
        p.*,
        'ZMW' AS currency,
        u.id AS landlord_user_id,
        u.full_name AS landlord_name,
        lp.verification_status AS landlord_verification_status,
        COALESCE(
          json_agg(
            json_build_object('id', pi.id, 'image_url', pi.image_url, 'is_primary', pi.is_primary)
            ORDER BY pi.is_primary DESC, pi.created_at ASC
          ) FILTER (WHERE pi.image_url IS NOT NULL),
          '[]'
        ) AS images
`;

const PropertyModel = {
  types: PROPERTY_TYPES,

  async create({
    landlord_id,
    title,
    description,
    address,
    area,
    rent_per_month,
    total_rooms,
    property_type = 'room',
    amenities = [],
    latitude = null,
    longitude = null,
    accommodation_gender = 'both',
    female_rooms_available = null,
    male_rooms_available = null,
  }) {
    const type = PROPERTY_TYPES.includes(property_type) ? property_type : 'room';
    const amenityList = Array.isArray(amenities) ? amenities.map(String) : [];
    const result = await pool.query(
      `INSERT INTO properties
        (landlord_id, title, description, address, area, rent_per_month, total_rooms, available_rooms,
         property_type, amenities, latitude, longitude, accommodation_gender, female_rooms_available,
         male_rooms_available, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12, $13, $14, 'pending')
       RETURNING *`,
      [
        landlord_id, title, description, address, area, rent_per_month, total_rooms, type, amenityList,
        latitude, longitude, accommodation_gender, female_rooms_available, male_rooms_available,
      ]
    );
    return result.rows[0];
  },

  async findAll(filters = {}) {
    const {
      min_price,
      max_price,
      area,
      verified,
      available,
      property_type,
      amenities,
      sort,
      page,
      limit,
      include_unverified,
      q,
      for_gender,
    } = filters;

    const params = [];
    let i = 1;
    let where = 'WHERE p.status <> \'unlisted\'';

    if (include_unverified === false) {
      where += ` AND p.verification_status = 'verified'`;
    }

    if (min_price) {
      where += ` AND p.rent_per_month >= $${i++}`;
      params.push(Number(min_price));
    }
    if (max_price) {
      where += ` AND p.rent_per_month <= $${i++}`;
      params.push(Number(max_price));
    }
    if (area) {
      where += ` AND LOWER(p.area) LIKE LOWER($${i++})`;
      params.push(`%${area}%`);
    }
    if (q) {
      where += ` AND (LOWER(p.title) LIKE LOWER($${i}) OR LOWER(p.address) LIKE LOWER($${i}) OR LOWER(p.area) LIKE LOWER($${i++}))`;
      params.push(`%${q}%`);
    }
    if (verified === 'true') {
      where += ` AND lp.verification_status = 'verified'`;
    }
    if (available === 'true') {
      where += ` AND p.available_rooms > 0 AND p.status = 'available'`;
    }
    if (property_type && PROPERTY_TYPES.includes(property_type)) {
      where += ` AND p.property_type = $${i++}`;
      params.push(property_type);
    }
    const genderFilter = String(for_gender || '').trim().toLowerCase();
    if (genderFilter === 'female') {
      where += ` AND (
        p.accommodation_gender = 'female'
        OR (
          p.accommodation_gender = 'both'
          AND (
            COALESCE(p.female_rooms_available, 0) > 0
            OR (p.female_rooms_available IS NULL AND p.male_rooms_available IS NULL)
          )
        )
      )`;
    } else if (genderFilter === 'male') {
      where += ` AND (
        p.accommodation_gender = 'male'
        OR (
          p.accommodation_gender = 'both'
          AND (
            COALESCE(p.male_rooms_available, 0) > 0
            OR (p.female_rooms_available IS NULL AND p.male_rooms_available IS NULL)
          )
        )
      )`;
    }
    if (amenities) {
      const list = String(amenities)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (list.length) {
        where += ` AND p.amenities @> $${i++}`;
        params.push(list);
      }
    }

    const orderBy = {
      price_asc: 'p.rent_per_month ASC',
      price_desc: 'p.rent_per_month DESC',
      newest: 'p.created_at DESC',
      recommended: `(CASE WHEN p.verification_status = 'verified' THEN 0 ELSE 1 END), (CASE WHEN lp.verification_status = 'verified' THEN 0 ELSE 1 END), p.created_at DESC`,
    }[sort] || 'p.created_at DESC';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * pageSize;

    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT p.id)::int AS total
       FROM properties p
       JOIN landlord_profiles lp ON p.landlord_id = lp.id
       JOIN users u ON lp.user_id = u.id
       ${where}`,
      params
    );

    const listParams = [...params, pageSize, offset];
    const result = await pool.query(
      `SELECT
        ${LISTING_SELECT}
       FROM properties p
       JOIN landlord_profiles lp ON p.landlord_id = lp.id
       JOIN users u ON lp.user_id = u.id
       LEFT JOIN property_images pi ON pi.property_id = p.id
       ${where}
       GROUP BY p.id, u.id, u.full_name, lp.verification_status
       ORDER BY ${orderBy}
       LIMIT $${i++} OFFSET $${i}`,
      listParams
    );

    const total = countResult.rows[0].total;
    await attachFavoriteFlags(result.rows, filters.user_id);
    return {
      properties: result.rows,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        total_pages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  },

  async findById(id, userId = null) {
    const result = await pool.query(
      `SELECT
        ${LISTING_SELECT}
       FROM properties p
       JOIN landlord_profiles lp ON p.landlord_id = lp.id
       JOIN users u ON lp.user_id = u.id
       LEFT JOIN property_images pi ON pi.property_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, u.id, u.full_name, lp.verification_status`,
      [id]
    );
    const property = result.rows[0] || null;
    if (property) await attachFavoriteFlags([property], userId);
    return property;
  },

  async findByLandlordId(landlord_id) {
    const result = await pool.query(
      `SELECT
        p.*,
        'ZMW' AS currency,
        COALESCE(
          json_agg(
            json_build_object('id', pi.id, 'image_url', pi.image_url, 'is_primary', pi.is_primary)
            ORDER BY pi.is_primary DESC, pi.created_at ASC
          ) FILTER (WHERE pi.image_url IS NOT NULL),
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

  async update(id, data) {
    const allowed = {
      title: data.title,
      description: data.description,
      address: data.address,
      area: data.area,
      rent_per_month: data.rent_per_month,
      total_rooms: data.total_rooms,
      property_type: data.property_type && PROPERTY_TYPES.includes(data.property_type)
        ? data.property_type
        : undefined,
      amenities: Array.isArray(data.amenities) ? data.amenities.map(String) : undefined,
      latitude: data.latitude === null ? null : data.latitude,
      longitude: data.longitude === null ? null : data.longitude,
      status: ['available', 'fully_booked', 'unlisted'].includes(data.status) ? data.status : undefined,
      accommodation_gender: ['female', 'male', 'both'].includes(data.accommodation_gender)
        ? data.accommodation_gender
        : undefined,
      female_rooms_available: data.female_rooms_available === null
        ? null
        : data.female_rooms_available,
      male_rooms_available: data.male_rooms_available === null
        ? null
        : data.male_rooms_available,
    };

    const sets = [];
    const params = [];
    let i = 1;
    for (const [key, value] of Object.entries(allowed)) {
      if (value === undefined) continue;
      sets.push(`${key} = $${i++}`);
      params.push(value);
    }
    if (!sets.length) {
      return this.findById(id);
    }
    sets.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query(
      `UPDATE properties SET ${sets.join(', ')}
       WHERE id = $${i}
       RETURNING *, 'ZMW' AS currency`,
      params
    );
    return result.rows[0] || null;
  },

  async setVerification(id, { status, rejection_reason = null, verified_by = null }) {
    const result = await pool.query(
      `UPDATE properties SET
        verification_status = $1::varchar,
        rejection_reason = $2,
        verified_at = CASE WHEN $1::varchar = 'verified' THEN NOW() ELSE NULL END,
        verified_by = CASE WHEN $1::varchar = 'verified' THEN $3 ELSE verified_by END,
        suspended_at = CASE WHEN $1::varchar = 'suspended' THEN NOW() ELSE NULL END,
        submitted_for_review_at = CASE WHEN $1::varchar = 'under_review' THEN NOW() ELSE submitted_for_review_at END,
        updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, rejection_reason, verified_by, id]
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

  async getLandlordUserIdByPropertyId(property_id) {
    const result = await pool.query(
      `SELECT lp.user_id
       FROM properties p
       JOIN landlord_profiles lp ON p.landlord_id = lp.id
       WHERE p.id = $1`,
      [property_id]
    );
    return result.rows[0]?.user_id || null;
  },

  async adjustAvailableRooms(property_id, delta) {
    const result = await pool.query(
      `UPDATE properties SET
        available_rooms = GREATEST(0, LEAST(total_rooms, available_rooms + $1)),
        status = CASE
          WHEN GREATEST(0, LEAST(total_rooms, available_rooms + $1)) = 0 THEN 'fully_booked'
          ELSE 'available'
        END,
        updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [delta, property_id]
    );
    return result.rows[0] || null;
  },
};

module.exports = PropertyModel;
