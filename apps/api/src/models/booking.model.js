const pool = require('../config/database');

const BookingModel = {

  async create({ student_id, property_id, move_in_date, move_out_date, amount }) {
    const result = await pool.query(
      `INSERT INTO bookings 
        (student_id, property_id, move_in_date, move_out_date, amount, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [student_id, property_id, move_in_date, move_out_date, amount]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT 
        b.*,
        'ZMW' AS currency,
        u.full_name AS student_name,
        u.email AS student_email,
        u.phone AS student_phone,
        p.title AS property_title,
        p.address AS property_address,
        p.area AS property_area
       FROM bookings b
       JOIN users u ON b.student_id = u.id
       JOIN properties p ON b.property_id = p.id
       WHERE b.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findByStudentId(student_id) {
    const result = await pool.query(
      `SELECT 
        b.*,
        'ZMW' AS currency,
        p.title AS property_title,
        p.address AS property_address,
        p.area AS property_area,
        u.full_name AS landlord_name,
        u.phone AS landlord_phone,
        lp.verification_status
       FROM bookings b
       JOIN properties p ON b.property_id = p.id
       JOIN landlord_profiles lp ON p.landlord_id = lp.id
       JOIN users u ON lp.user_id = u.id
       WHERE b.student_id = $1
       ORDER BY b.created_at DESC`,
      [student_id]
    );
    return result.rows;
  },

  async findByLandlordId(landlord_id) {
    const result = await pool.query(
      `SELECT 
        b.*,
        'ZMW' AS currency,
        p.title AS property_title,
        p.address AS property_address,
        u.full_name AS student_name,
        u.email AS student_email,
        u.phone AS student_phone
       FROM bookings b
       JOIN properties p ON b.property_id = p.id
       JOIN landlord_profiles lp ON p.landlord_id = lp.id
       JOIN users u ON b.student_id = u.id
       WHERE lp.id = $1
       ORDER BY b.created_at DESC`,
      [landlord_id]
    );
    return result.rows;
  },

  async updateStatus(id, status, extraFields = {}) {
    const fields = { status, updated_at: 'NOW()', ...extraFields };

    const setClauses = Object.keys(fields).map((key, index) => {
      if (fields[key] === 'NOW()') return `${key} = NOW()`;
      return `${key} = $${index + 2}`;
    });

    const values = Object.values(fields).filter(v => v !== 'NOW()');

    const result = await pool.query(
      `UPDATE bookings SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  },

  // Used by cron job — find all bookings that have passed auto_release_at
  async findExpiredEscrows() {
    const result = await pool.query(
      `SELECT * FROM bookings 
       WHERE status = 'move_in_window' 
       AND auto_release_at IS NOT NULL
       AND auto_release_at <= NOW()`
    );
    return result.rows;
  },

  async logAudit({ booking_id, actor_id, from_status, to_status, reason }) {
    await pool.query(
      `INSERT INTO booking_audit_log 
        (booking_id, actor_id, from_status, to_status, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [booking_id, actor_id, from_status, to_status, reason]
    );
  },

  async createEscrowTransaction({ booking_id, type, amount, status, reference }) {
    await pool.query(
      `INSERT INTO escrow_transactions 
        (booking_id, type, amount, status, reference)
       VALUES ($1, $2, $3, $4, $5)`,
      [booking_id, type, amount, status, reference]
    );
  },

};

module.exports = BookingModel;