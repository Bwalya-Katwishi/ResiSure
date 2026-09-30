const pool = require('../config/database');
const PropertyService = require('./property.service');
const AuditService = require('./audit.service');
const NotificationService = require('./notification.service');
const { secureDocUrl } = require('../config/verificationUpload');

function mapLandlordRow(row) {
  const userId = row.user_id;
  const mapDoc = (ref, docType) => secureDocUrl(ref, { forAdmin: true, userId, role: 'landlord', docType });

  return {
    ...row,
    has_nrc_doc: Boolean(row.nrc_doc_url),
    has_land_doc: Boolean(row.land_doc_url || row.verification_doc_url),
    nrc_doc_url: mapDoc(row.nrc_doc_url, 'nrc'),
    land_doc_url: mapDoc(row.land_doc_url || row.verification_doc_url, 'land'),
    verification_doc_url: mapDoc(row.land_doc_url || row.verification_doc_url, 'land'),
  };
}

function mapStudentRow(row) {
  const userId = row.user_id;
  return {
    ...row,
    has_nrc_doc: Boolean(row.nrc_doc_url),
    has_university_slip: Boolean(row.university_slip_url),
    nrc_doc_url: secureDocUrl(row.nrc_doc_url, { forAdmin: true, userId, role: 'student', docType: 'nrc' }),
    university_slip_url: secureDocUrl(row.university_slip_url, {
      forAdmin: true,
      userId,
      role: 'student',
      docType: 'university_slip',
    }),
  };
}

const AdminService = {
  async stats() {
    const [users, properties, bookings, escrow, disputes] = await Promise.all([
      pool.query(`SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`),
      pool.query(`SELECT verification_status, COUNT(*)::int AS count FROM properties GROUP BY verification_status`),
      pool.query(`SELECT status, COUNT(*)::int AS count FROM bookings GROUP BY status`),
      pool.query(`
        SELECT type, status, COALESCE(SUM(amount), 0)::numeric AS total, COUNT(*)::int AS count
        FROM escrow_transactions
        GROUP BY type, status
      `),
      pool.query(`SELECT resolution, COUNT(*)::int AS count FROM disputes GROUP BY resolution`),
    ]);

    return {
      users: users.rows,
      properties: properties.rows,
      bookings: bookings.rows,
      escrow: escrow.rows,
      disputes: disputes.rows,
    };
  },

  async listUsers() {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.phone, u.is_verified, u.created_at,
              lp.verification_status AS landlord_verification_status,
              sp.verification_status AS student_verification_status
       FROM users u
       LEFT JOIN landlord_profiles lp ON lp.user_id = u.id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  },

  async listProperties() {
    const result = await pool.query(
      `SELECT p.id, p.title, p.area, p.rent_per_month, p.status, p.verification_status,
              p.rejection_reason, p.property_type, p.available_rooms, p.total_rooms,
              p.created_at, u.full_name AS landlord_name, u.id AS landlord_user_id
       FROM properties p
       JOIN landlord_profiles lp ON p.landlord_id = lp.id
       JOIN users u ON lp.user_id = u.id
       ORDER BY
         CASE p.verification_status
           WHEN 'under_review' THEN 0
           WHEN 'pending' THEN 1
           WHEN 'rejected' THEN 2
           ELSE 3
         END,
         p.created_at DESC`
    );
    return result.rows;
  },

  async listBookings() {
    const result = await pool.query(
      `SELECT b.id, b.status, b.amount, b.move_in_date, b.escrow_held_at, b.confirmed_at, b.created_at,
              p.title AS property_title, su.full_name AS student_name, lu.full_name AS landlord_name
       FROM bookings b
       JOIN properties p ON p.id = b.property_id
       JOIN users su ON su.id = b.student_id
       JOIN landlord_profiles lp ON lp.id = p.landlord_id
       JOIN users lu ON lu.id = lp.user_id
       ORDER BY b.created_at DESC
       LIMIT 200`
    );
    return result.rows;
  },

  async listPayments() {
    const result = await pool.query(
      `SELECT t.id, t.booking_id, t.type, t.amount, t.status, t.reference,
              t.payment_provider, t.created_at, b.status AS booking_status, p.title AS property_title
       FROM escrow_transactions t
       JOIN bookings b ON b.id = t.booking_id
       JOIN properties p ON p.id = b.property_id
       ORDER BY t.created_at DESC
       LIMIT 200`
    );
    return result.rows;
  },

  async listLandlords() {
    const result = await pool.query(`
      SELECT u.id AS user_id, u.full_name, u.email, u.phone,
             lp.verification_status, lp.id AS profile_id,
             lp.nrc_number, lp.nrc_doc_url, lp.land_doc_url, lp.verification_doc_url, lp.verified_at
      FROM users u
      JOIN landlord_profiles lp ON u.id = lp.user_id
      ORDER BY lp.verification_status ASC, u.created_at DESC
    `);

    return result.rows.map(mapLandlordRow);
  },

  async getLandlord(userId) {
    const result = await pool.query(`
      SELECT u.id AS user_id, u.full_name, u.email, u.phone, u.created_at,
             lp.verification_status, lp.id AS profile_id,
             lp.nrc_number, lp.nrc_doc_url, lp.land_doc_url, lp.verification_doc_url, lp.verified_at
      FROM users u
      JOIN landlord_profiles lp ON u.id = lp.user_id
      WHERE u.id = $1
    `, [userId]);
    if (!result.rows[0]) throw { status: 404, message: 'Landlord not found' };
    return mapLandlordRow(result.rows[0]);
  },

  async listStudents() {
    const result = await pool.query(`
      SELECT u.id AS user_id, u.full_name, u.email, u.phone, u.profile_photo_url,
             sp.verification_status, sp.id AS profile_id,
             sp.nrc_number, sp.nrc_doc_url, sp.university_slip_url, sp.verified_at
      FROM users u
      JOIN student_profiles sp ON u.id = sp.user_id
      ORDER BY sp.verification_status ASC, u.created_at DESC
    `);
    return result.rows.map(mapStudentRow);
  },

  async getStudent(userId) {
    const result = await pool.query(`
      SELECT u.id AS user_id, u.full_name, u.email, u.phone, u.profile_photo_url, u.created_at,
             sp.verification_status, sp.id AS profile_id,
             sp.nrc_number, sp.nrc_doc_url, sp.university_slip_url, sp.verified_at
      FROM users u
      JOIN student_profiles sp ON u.id = sp.user_id
      WHERE u.id = $1
    `, [userId]);
    if (!result.rows[0]) throw { status: 404, message: 'Student not found' };
    return mapStudentRow(result.rows[0]);
  },

  async verifyLandlord(adminId, userId, { status, rejection_reason, verification_expires_at } = {}) {
    const allowed = ['verified', 'rejected', 'suspended', 'expired', 'pending'];
    if (!allowed.includes(status)) {
      throw { status: 400, message: `Status must be one of: ${allowed.join(', ')}` };
    }
    if (status === 'rejected' && !String(rejection_reason || '').trim()) {
      throw { status: 400, message: 'A rejection reason is required' };
    }

    const result = await pool.query(
      `UPDATE landlord_profiles SET
        verification_status = $1::varchar,
        verified_at = CASE WHEN $1::varchar = 'verified' THEN NOW() ELSE verified_at END,
        verified_by = CASE WHEN $1::varchar = 'verified' THEN $2::uuid ELSE verified_by END,
        verification_expires_at = $3::timestamptz,
        rejection_reason = CASE WHEN $1::varchar = 'rejected' THEN $4::text ELSE rejection_reason END,
        suspended_at = CASE WHEN $1::varchar = 'suspended' THEN NOW() ELSE suspended_at END,
        suspended_by = CASE WHEN $1::varchar = 'suspended' THEN $2::uuid ELSE suspended_by END
       WHERE user_id = $5::uuid
       RETURNING id`,
      [
        status,
        adminId,
        verification_expires_at || null,
        status === 'rejected' ? String(rejection_reason).trim() : null,
        userId,
      ]
    );
    if (!result.rows[0]) throw { status: 404, message: 'Landlord profile not found' };

    if (status === 'suspended') {
      await pool.query(
        `UPDATE users SET account_status = 'suspended' WHERE id = $1`,
        [userId]
      );
    } else {
      await pool.query(
        `UPDATE users SET account_status = 'active' WHERE id = $1 AND account_status = 'suspended'`,
        [userId]
      );
    }

    const actionMap = {
      verified: 'LANDLORD_VERIFIED',
      rejected: 'LANDLORD_REJECTED',
      suspended: 'LANDLORD_SUSPENDED',
      expired: 'LANDLORD_EXPIRED',
      pending: 'LANDLORD_RESET_PENDING',
    };

    await AuditService.log({
      actor_id: adminId,
      action: actionMap[status] || 'LANDLORD_STATUS_UPDATED',
      entity_type: 'user',
      entity_id: userId,
      metadata: { status, rejection_reason: rejection_reason || null },
    });

    const messages = {
      verified: 'Your landlord account has been verified. Your listings now show the verified landlord badge.',
      rejected: `Your landlord verification was rejected: ${String(rejection_reason).trim()}`,
      suspended: 'Your landlord account has been suspended. You cannot accept bookings or receive escrow releases.',
      expired: 'Your landlord verification has expired. Re-submit your documents for review.',
      pending: 'Your landlord verification status was reset to pending.',
    };

    await NotificationService.create({
      user_id: userId,
      type: `landlord_${status}`,
      message: messages[status],
      link: '/dashboard/landlord',
    });
  },

  async verifyStudent(adminId, userId, { status, rejection_reason, verification_expires_at } = {}) {
    const allowed = ['verified', 'rejected', 'suspended', 'expired', 'pending'];
    if (!allowed.includes(status)) {
      throw { status: 400, message: `Status must be one of: ${allowed.join(', ')}` };
    }
    if (status === 'rejected' && !String(rejection_reason || '').trim()) {
      throw { status: 400, message: 'A rejection reason is required' };
    }

    const result = await pool.query(
      `UPDATE student_profiles SET
        verification_status = $1::varchar,
        verified_at = CASE
          WHEN $1::varchar = 'verified' THEN NOW()
          WHEN $1::varchar IN ('rejected', 'suspended', 'expired', 'pending') THEN NULL
          ELSE verified_at
        END,
        verified_by = CASE WHEN $1::varchar = 'verified' THEN $2::uuid ELSE verified_by END,
        verification_expires_at = $3::timestamptz,
        rejection_reason = CASE WHEN $1::varchar = 'rejected' THEN $4::text ELSE rejection_reason END,
        suspended_at = CASE WHEN $1::varchar = 'suspended' THEN NOW() ELSE suspended_at END,
        suspended_by = CASE WHEN $1::varchar = 'suspended' THEN $2::uuid ELSE suspended_by END
       WHERE user_id = $5::uuid
       RETURNING id`,
      [
        status,
        adminId,
        verification_expires_at || null,
        status === 'rejected' ? String(rejection_reason).trim() : null,
        userId,
      ]
    );
    if (!result.rows[0]) throw { status: 404, message: 'Student profile not found' };

    await pool.query(
      `UPDATE users SET is_verified = $1 WHERE id = $2`,
      [status === 'verified', userId]
    );

    if (status === 'suspended') {
      await pool.query(`UPDATE users SET account_status = 'suspended' WHERE id = $1`, [userId]);
    } else {
      await pool.query(
        `UPDATE users SET account_status = 'active' WHERE id = $1 AND account_status = 'suspended'`,
        [userId]
      );
    }

    const actionMap = {
      verified: 'STUDENT_VERIFIED',
      rejected: 'STUDENT_REJECTED',
      suspended: 'STUDENT_SUSPENDED',
      expired: 'STUDENT_EXPIRED',
      pending: 'STUDENT_RESET_PENDING',
    };

    await AuditService.log({
      actor_id: adminId,
      action: actionMap[status] || 'STUDENT_STATUS_UPDATED',
      entity_type: 'user',
      entity_id: userId,
      metadata: { status, rejection_reason: rejection_reason || null },
    });

    const messages = {
      verified: 'Your student account has been verified. You can now book rooms with full confidence.',
      rejected: `Your student verification was rejected: ${String(rejection_reason).trim()}`,
      suspended: 'Your student account has been suspended. Contact support for assistance.',
      expired: 'Your student verification has expired. Re-submit your documents for review.',
      pending: 'Your student verification status was reset to pending.',
    };

    await NotificationService.create({
      user_id: userId,
      type: `student_${status}`,
      message: messages[status],
      link: '/dashboard/student',
    });
  },

  async listDisputes() {
    const result = await pool.query(`
      SELECT d.*, b.amount, b.id AS booking_id,
             u.full_name AS raised_by_name, p.title AS property_title
      FROM disputes d
      JOIN bookings b ON d.booking_id = b.id
      JOIN users u ON d.raised_by = u.id
      JOIN properties p ON p.id = b.property_id
      WHERE d.resolution = 'pending'
      ORDER BY d.created_at DESC
    `);
    return result.rows;
  },

  verifyProperty(id, adminId, body) {
    return PropertyService.verifyProperty(id, adminId, body);
  },
};

module.exports = AdminService;
