const pool = require('../config/database');
const AuditService = require('./audit.service');

const RiskFlagService = {
  async create({ user_id, property_id, flag_type, severity = 'medium', reason, metadata = {} }) {
    const result = await pool.query(
      `INSERT INTO risk_flags (user_id, property_id, flag_type, severity, reason, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id || null, property_id || null, flag_type, severity, reason, metadata]
    );
    return result.rows[0];
  },

  async scanDuplicateContact(userId, { email, phone }) {
    const flags = [];

    if (phone) {
      const phoneDupes = await pool.query(
        `SELECT u.id, u.full_name, u.role
         FROM users u
         WHERE u.phone = $1 AND u.id != $2
         LIMIT 5`,
        [phone, userId]
      );
      if (phoneDupes.rows.length > 0) {
        flags.push(await this.create({
          user_id: userId,
          flag_type: 'duplicate_phone',
          severity: 'medium',
          reason: `Phone number shared with ${phoneDupes.rows.length} other account(s)`,
          metadata: { matches: phoneDupes.rows.map((r) => ({ id: r.id, role: r.role })) },
        }));
      }
    }

    if (email) {
      const emailDupes = await pool.query(
        `SELECT u.id, u.full_name, u.role
         FROM users u
         WHERE LOWER(u.email) = LOWER($1) AND u.id != $2
         LIMIT 5`,
        [email, userId]
      );
      if (emailDupes.rows.length > 0) {
        flags.push(await this.create({
          user_id: userId,
          flag_type: 'duplicate_email',
          severity: 'high',
          reason: `Email shared with ${emailDupes.rows.length} other account(s)`,
          metadata: { matches: emailDupes.rows.map((r) => ({ id: r.id, role: r.role })) },
        }));
      }
    }

    return flags;
  },

  async scanSuspiciousListing(propertyId, { address, rent, area, landlordUserId }) {
    const flags = [];

    if (address) {
      const addressDupes = await pool.query(
        `SELECT p.id, p.title
         FROM properties p
         JOIN landlord_profiles lp ON lp.id = p.landlord_id
         WHERE LOWER(TRIM(p.address)) = LOWER(TRIM($1))
           AND p.id != $2
           AND p.verification_status NOT IN ('rejected')
         LIMIT 5`,
        [address, propertyId]
      );
      if (addressDupes.rows.length > 0) {
        flags.push(await this.create({
          user_id: landlordUserId,
          property_id: propertyId,
          flag_type: 'duplicate_address',
          severity: 'medium',
          reason: `Address matches ${addressDupes.rows.length} other listing(s)`,
          metadata: { matches: addressDupes.rows },
        }));
      }
    }

    if (rent && area) {
      const avgResult = await pool.query(
        `SELECT AVG(rent_per_month)::numeric AS avg_rent, COUNT(*)::int AS count
         FROM properties
         WHERE LOWER(area) = LOWER($1)
           AND verification_status = 'verified'
           AND id != $2`,
        [area, propertyId]
      );
      const avgRent = Number(avgResult.rows[0]?.avg_rent);
      const count = avgResult.rows[0]?.count || 0;
      if (count >= 3 && avgRent > 0 && Number(rent) < avgRent * 0.4) {
        flags.push(await this.create({
          user_id: landlordUserId,
          property_id: propertyId,
          flag_type: 'unusually_low_price',
          severity: 'low',
          reason: `Rent (ZMW ${rent}) is below 40% of area average (ZMW ${Math.round(avgRent)})`,
          metadata: { area, rent: Number(rent), area_average: avgRent, comparable_count: count },
        }));
      }
    }

    return flags;
  },

  async scanRapidListingCreation(landlordUserId) {
    const recent = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM properties p
       JOIN landlord_profiles lp ON lp.id = p.landlord_id
       WHERE lp.user_id = $1
         AND p.created_at >= NOW() - INTERVAL '24 hours'`,
      [landlordUserId]
    );
    if ((recent.rows[0]?.count || 0) >= 5) {
      return this.create({
        user_id: landlordUserId,
        flag_type: 'rapid_listing_creation',
        severity: 'medium',
        reason: `${recent.rows[0].count} listings created in the last 24 hours`,
        metadata: { count: recent.rows[0].count },
      });
    }
    return null;
  },

  async list({ status = 'open', limit = 100, offset = 0 } = {}) {
    const result = await pool.query(
      `SELECT rf.*, u.full_name AS user_name, p.title AS property_title
       FROM risk_flags rf
       LEFT JOIN users u ON u.id = rf.user_id
       LEFT JOIN properties p ON p.id = rf.property_id
       WHERE ($1::text IS NULL OR rf.status = $1)
       ORDER BY
         CASE rf.severity
           WHEN 'critical' THEN 0
           WHEN 'high' THEN 1
           WHEN 'medium' THEN 2
           ELSE 3
         END,
         rf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status || null, Math.min(Number(limit) || 100, 200), Number(offset) || 0]
    );
    return result.rows;
  },

  async review(flagId, adminId, { status, review_notes }) {
    if (!['reviewed', 'cleared', 'confirmed'].includes(status)) {
      throw { status: 400, message: 'Status must be reviewed, cleared, or confirmed' };
    }
    const result = await pool.query(
      `UPDATE risk_flags SET
        status = $1,
        reviewed_by = $2,
        reviewed_at = NOW(),
        review_notes = $3
       WHERE id = $4
       RETURNING *`,
      [status, adminId, review_notes || null, flagId]
    );
    if (!result.rows[0]) throw { status: 404, message: 'Risk flag not found' };

    await AuditService.log({
      actor_id: adminId,
      action: 'RISK_FLAG_REVIEWED',
      entity_type: 'risk_flag',
      entity_id: flagId,
      metadata: { status, review_notes },
    });

    return result.rows[0];
  },
};

module.exports = RiskFlagService;
