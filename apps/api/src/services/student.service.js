const fs = require('fs');
const { validateNrcNumber } = require('@resisure/shared');
const pool = require('../config/database');
const NotificationService = require('./notification.service');
const {
  persistVerifiedDocument,
  isLocalDocRef,
  isRemoteDocRef,
  resolveLocalDocPath,
  contentTypeForFilename,
  localFilenameFromRef,
  secureDocUrl,
} = require('../config/verificationUpload');
const { streamRemoteDocument } = require('../utils/streamRemoteDoc');

function withSecureDocAccess(profile, { forAdmin = false } = {}) {
  if (!profile) return null;
  const copy = { ...profile };
  const userId = copy.user_id;

  copy.has_nrc_doc = Boolean(copy.nrc_doc_url);
  copy.has_university_slip = Boolean(copy.university_slip_url);
  copy.nrc_doc_url = secureDocUrl(copy.nrc_doc_url, { forAdmin, userId, role: 'student', docType: 'nrc' });
  copy.university_slip_url = secureDocUrl(copy.university_slip_url, {
    forAdmin,
    userId,
    role: 'student',
    docType: 'university_slip',
  });
  return copy;
}

const StudentService = {
  async getProfile(userId) {
    const result = await pool.query(
      `SELECT sp.*, u.full_name, u.email, u.phone, u.profile_photo_url
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.user_id = $1`,
      [userId]
    );
    return withSecureDocAccess(result.rows[0] || null);
  },

  async submitVerification(userId, { nrc_number }, files = {}) {
    const nrcError = validateNrcNumber(nrc_number);
    if (nrcError) {
      throw { status: 400, message: nrcError };
    }

    const nrcFile = files.nrc_document?.[0];
    const slipFile = files.university_slip?.[0];
    if (!nrcFile) {
      throw { status: 400, message: 'Upload your NRC document' };
    }
    if (!slipFile) {
      throw { status: 400, message: 'Upload your university confirmation slip or equivalent document' };
    }

    const profile = await pool.query(
      'SELECT * FROM student_profiles WHERE user_id = $1',
      [userId]
    );
    if (!profile.rows[0]) throw { status: 404, message: 'Student profile not found' };

    const nrcDocRef = await persistVerifiedDocument(nrcFile);
    const slipDocRef = await persistVerifiedDocument(slipFile);

    const result = await pool.query(
      `UPDATE student_profiles
       SET nrc_number = $1,
           nrc_doc_url = $2,
           university_slip_url = $3,
           verification_status = CASE
             WHEN verification_status = 'rejected' THEN 'pending'
             ELSE verification_status
           END
       WHERE user_id = $4
       RETURNING *`,
      [String(nrc_number).trim(), nrcDocRef, slipDocRef, userId]
    );

    const userRow = await pool.query(
      'SELECT full_name FROM users WHERE id = $1',
      [userId]
    );
    await NotificationService.notifyAdmins({
      type: 'student_verification',
      message: `${userRow.rows[0]?.full_name || 'A student'} submitted verification documents for review.`,
      link: '/dashboard/admin',
    });

    return withSecureDocAccess({ ...result.rows[0], user_id: userId });
  },

  async streamVerificationDocument(userId, docType, res) {
    const result = await pool.query(
      'SELECT nrc_doc_url, university_slip_url FROM student_profiles WHERE user_id = $1',
      [userId]
    );
    const row = result.rows[0];
    if (!row) throw { status: 404, message: 'Student profile not found' };

    const ref = docType === 'nrc' ? row.nrc_doc_url : row.university_slip_url;
    if (!ref) throw { status: 404, message: 'Document not found' };

    if (isRemoteDocRef(ref)) {
      const filename = localFilenameFromRef(ref) || `${docType}-document`;
      await streamRemoteDocument(ref, res, {
        filename: `${docType}-${filename}`,
        contentType: contentTypeForFilename(filename),
      });
      return;
    }

    const filePath = resolveLocalDocPath(ref);
    if (!filePath || !fs.existsSync(filePath)) {
      throw { status: 404, message: 'Document file not found' };
    }

    const filename = localFilenameFromRef(ref);
    res.setHeader('Content-Type', contentTypeForFilename(filename));
    res.setHeader('Content-Disposition', `inline; filename="${docType}-${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return fs.createReadStream(filePath).pipe(res);
  },
};

module.exports = StudentService;
