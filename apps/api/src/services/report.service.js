const pool = require('../config/database');
const AuditService = require('./audit.service');
const NotificationService = require('./notification.service');

const VALID_ENTITY_TYPES = ['property', 'user', 'booking', 'payment_request', 'other'];
const VALID_CATEGORIES = [
  'scam',
  'misleading_listing',
  'harassment',
  'off_platform_payment',
  'identity_fraud',
  'duplicate_listing',
  'other',
];

const ReportService = {
  async create(reporterId, { entity_type, entity_id, category, description, evidence_url }) {
    if (!VALID_ENTITY_TYPES.includes(entity_type)) {
      throw { status: 400, message: `entity_type must be one of: ${VALID_ENTITY_TYPES.join(', ')}` };
    }
    if (!VALID_CATEGORIES.includes(category)) {
      throw { status: 400, message: `category must be one of: ${VALID_CATEGORIES.join(', ')}` };
    }
    if (!description || !String(description).trim()) {
      throw { status: 400, message: 'A description is required' };
    }

    const result = await pool.query(
      `INSERT INTO content_reports
        (reporter_id, entity_type, entity_id, category, description, evidence_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        reporterId,
        entity_type,
        entity_id || null,
        category,
        String(description).trim(),
        evidence_url || null,
      ]
    );

    await AuditService.log({
      actor_id: reporterId,
      action: 'REPORT_CREATED',
      entity_type: 'content_report',
      entity_id: result.rows[0].id,
      metadata: { entity_type, entity_id, category },
    });

    await NotificationService.notifyAdmins({
      type: 'content_report',
      message: `New ${category} report submitted (${entity_type})`,
      link: '/dashboard/admin',
    });

    return result.rows[0];
  },

  async listForReporter(reporterId) {
    const result = await pool.query(
      `SELECT id, entity_type, entity_id, category, status, created_at, updated_at, resolved_at
       FROM content_reports
       WHERE reporter_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [reporterId]
    );
    return result.rows;
  },

  async listForAdmin({ status, limit = 100, offset = 0 } = {}) {
    const result = await pool.query(
      `SELECT cr.*, u.full_name AS reporter_name
       FROM content_reports cr
       JOIN users u ON u.id = cr.reporter_id
       WHERE ($1::text IS NULL OR cr.status = $1)
       ORDER BY cr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status || null, Math.min(Number(limit) || 100, 200), Number(offset) || 0]
    );
    return result.rows;
  },

  async updateStatus(reportId, adminId, { status, resolution_notes, assigned_to }) {
    if (!['investigating', 'resolved', 'dismissed'].includes(status)) {
      throw { status: 400, message: 'Status must be investigating, resolved, or dismissed' };
    }

    const result = await pool.query(
      `UPDATE content_reports SET
        status = $1,
        resolution_notes = COALESCE($2, resolution_notes),
        assigned_to = COALESCE($3, assigned_to),
        resolved_by = CASE WHEN $1 IN ('resolved', 'dismissed') THEN $4 ELSE resolved_by END,
        resolved_at = CASE WHEN $1 IN ('resolved', 'dismissed') THEN NOW() ELSE resolved_at END,
        updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [status, resolution_notes || null, assigned_to || null, adminId, reportId]
    );
    if (!result.rows[0]) throw { status: 404, message: 'Report not found' };

    await AuditService.log({
      actor_id: adminId,
      action: 'REPORT_UPDATED',
      entity_type: 'content_report',
      entity_id: reportId,
      metadata: { status, resolution_notes },
    });

    await NotificationService.create({
      user_id: result.rows[0].reporter_id,
      type: 'report_update',
      message: status === 'resolved'
        ? 'Your report has been reviewed and resolved. Thank you for helping keep ResiSure safe.'
        : status === 'dismissed'
          ? 'Your report was reviewed. No further action was taken at this time.'
          : 'Your report is being investigated by our team.',
      link: '/dashboard/student',
    });

    return result.rows[0];
  },
};

module.exports = ReportService;
