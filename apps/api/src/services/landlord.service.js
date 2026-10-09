const { validateNrcNumber } = require('@resisure/shared');
const pool = require('../config/database');
const NotificationService = require('./notification.service');
const {
  persistVerifiedDocument,
  secureDocUrl,
} = require('../config/verificationUpload');
const { streamVerificationDocumentRef } = require('../utils/streamVerificationDoc');

function withSecureDocAccess(profile, { forAdmin = false } = {}) {
  if (!profile) return null;
  const copy = { ...profile };
  const userId = copy.user_id;

  copy.has_nrc_doc = Boolean(copy.nrc_doc_url);
  copy.has_land_doc = Boolean(copy.land_doc_url);
  copy.has_verification_doc = copy.has_nrc_doc || copy.has_land_doc || Boolean(copy.verification_doc_url);

  copy.nrc_doc_url = secureDocUrl(copy.nrc_doc_url, { forAdmin, userId, role: 'landlord', docType: 'nrc' });
  copy.land_doc_url = secureDocUrl(copy.land_doc_url, { forAdmin, userId, role: 'landlord', docType: 'land' });

  if (copy.verification_doc_url && !copy.land_doc_url) {
    copy.verification_doc_url = secureDocUrl(copy.verification_doc_url, {
      forAdmin,
      userId,
      role: 'landlord',
      docType: 'land',
    });
  } else {
    copy.verification_doc_url = copy.land_doc_url;
  }

  return copy;
}

const LandlordService = {
  async getProfile(userId) {
    const result = await pool.query(
      `SELECT lp.*, u.full_name, u.email, u.phone
       FROM landlord_profiles lp
       JOIN users u ON u.id = lp.user_id
       WHERE lp.user_id = $1`,
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
    const landFile = files.land_document?.[0];
    if (!nrcFile) {
      throw { status: 400, message: 'Upload your NRC document' };
    }
    if (!landFile) {
      throw { status: 400, message: 'Upload your land title or proof-of-ownership document' };
    }

    const profile = await pool.query(
      'SELECT * FROM landlord_profiles WHERE user_id = $1',
      [userId]
    );
    if (!profile.rows[0]) throw { status: 404, message: 'Landlord profile not found' };

    const nrcDocRef = await persistVerifiedDocument(nrcFile);
    const landDocRef = await persistVerifiedDocument(landFile);

    const result = await pool.query(
      `UPDATE landlord_profiles
       SET nrc_number = $1,
           nrc_doc_url = $2,
           land_doc_url = $3,
           verification_doc_url = $3,
           verification_status = CASE
             WHEN verification_status = 'rejected' THEN 'pending'
             ELSE verification_status
           END
       WHERE user_id = $4
       RETURNING *`,
      [String(nrc_number).trim(), nrcDocRef, landDocRef, userId]
    );

    const userRow = await pool.query(
      'SELECT full_name FROM users WHERE id = $1',
      [userId]
    );
    await NotificationService.notifyAdmins({
      type: 'landlord_verification',
      message: `${userRow.rows[0]?.full_name || 'A landlord'} submitted NRC and title deed for verification review.`,
      link: '/dashboard/admin',
    });

    return withSecureDocAccess({ ...result.rows[0], user_id: userId });
  },

  async streamVerificationDocument(userId, docType, res) {
    const result = await pool.query(
      'SELECT nrc_doc_url, land_doc_url, verification_doc_url FROM landlord_profiles WHERE user_id = $1',
      [userId]
    );
    const row = result.rows[0];
    if (!row) throw { status: 404, message: 'Landlord profile not found' };

    let ref;
    if (docType === 'nrc') {
      ref = row.nrc_doc_url;
    } else {
      ref = row.land_doc_url || row.verification_doc_url;
    }
    await streamVerificationDocumentRef(ref, res, { docType });
  },
};

module.exports = LandlordService;
