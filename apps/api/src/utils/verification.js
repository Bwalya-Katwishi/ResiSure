const pool = require('../config/database');

const MESSAGES = {
  studentNotVerified:
    'Your student account must be verified before booking. Upload your NRC and university confirmation slip on your dashboard, then wait for admin approval.',
  studentSuspended:
    'Your student account is suspended. Contact support for assistance.',
  studentExpired:
    'Your student verification has expired. Re-submit your documents for review.',
  landlordNotVerified:
    'Your landlord account must be verified before you can manage bookings or submit listings for review. Complete verification on your dashboard.',
  landlordSuspended:
    'Your landlord account is suspended. You cannot accept bookings or receive escrow releases.',
  landlordExpired:
    'Your landlord verification has expired. Re-submit your documents for review.',
  landlordDocsMissing:
    'Upload your NRC and land title documents before submitting a listing for review.',
  landlordAccountUnverified:
    'This listing is from a landlord whose account is still under review. Choose a verified landlord or check back later.',
  landlordAccountSuspended:
    'This listing is from a suspended landlord and cannot be booked.',
  propertyNotVerified:
    'This listing cannot be booked right now.',
  propertySuspended:
    'This listing is suspended and cannot be booked.',
  accountSuspended:
    'Your account is suspended. Contact support for assistance.',
};

function isVerificationExpired(profile) {
  if (!profile?.verification_expires_at) return false;
  return new Date(profile.verification_expires_at) < new Date();
}

function assertActiveVerificationStatus(status, role) {
  if (status === 'suspended') {
    throw {
      status: 403,
      message: role === 'student' ? MESSAGES.studentSuspended : MESSAGES.landlordSuspended,
      code: role === 'student' ? 'STUDENT_SUSPENDED' : 'LANDLORD_SUSPENDED',
    };
  }
  if (status === 'expired') {
    throw {
      status: 403,
      message: role === 'student' ? MESSAGES.studentExpired : MESSAGES.landlordExpired,
      code: role === 'student' ? 'STUDENT_EXPIRED' : 'LANDLORD_EXPIRED',
    };
  }
  if (status === 'rejected') {
    throw {
      status: 403,
      message: role === 'student' ? MESSAGES.studentNotVerified : MESSAGES.landlordNotVerified,
      code: role === 'student' ? 'STUDENT_NOT_VERIFIED' : 'LANDLORD_NOT_VERIFIED',
    };
  }
}

async function getStudentStatus(userId) {
  const result = await pool.query(
    'SELECT verification_status FROM student_profiles WHERE user_id = $1',
    [userId]
  );
  return result.rows[0]?.verification_status || 'pending';
}

async function getLandlordProfile(userId) {
  const result = await pool.query(
    `SELECT verification_status, nrc_doc_url, land_doc_url, verification_doc_url,
            verification_expires_at, rejection_reason
     FROM landlord_profiles WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function getStudentProfile(userId) {
  const result = await pool.query(
    `SELECT verification_status, verification_expires_at, rejection_reason
     FROM student_profiles WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

const VerificationGate = {
  messages: MESSAGES,

  async requireVerifiedStudent(userId) {
    const profile = await getStudentProfile(userId);
    const status = profile?.verification_status || 'pending';
    assertActiveVerificationStatus(status, 'student');
    if (status !== 'verified' || isVerificationExpired(profile)) {
      throw {
        status: 403,
        message: isVerificationExpired(profile) ? MESSAGES.studentExpired : MESSAGES.studentNotVerified,
        code: isVerificationExpired(profile) ? 'STUDENT_EXPIRED' : 'STUDENT_NOT_VERIFIED',
      };
    }
  },

  async requireVerifiedLandlord(userId) {
    const profile = await getLandlordProfile(userId);
    if (!profile) throw { status: 404, message: 'Landlord profile not found' };
    assertActiveVerificationStatus(profile.verification_status, 'landlord');
    if (profile.verification_status !== 'verified' || isVerificationExpired(profile)) {
      throw {
        status: 403,
        message: isVerificationExpired(profile) ? MESSAGES.landlordExpired : MESSAGES.landlordNotVerified,
        code: isVerificationExpired(profile) ? 'LANDLORD_EXPIRED' : 'LANDLORD_NOT_VERIFIED',
      };
    }
    return profile;
  },

  async requireLandlordDocsForReview(userId) {
    const profile = await getLandlordProfile(userId);
    if (!profile) throw { status: 404, message: 'Landlord profile not found' };
    const hasLandDoc = Boolean(profile.land_doc_url || profile.verification_doc_url);
    if (!profile.nrc_doc_url || !hasLandDoc) {
      throw { status: 400, message: MESSAGES.landlordDocsMissing, code: 'LANDLORD_DOCS_MISSING' };
    }
    return profile;
  },

  assertVerifiedLandlordOnProperty(property) {
    const status = property.landlord_verification_status;
    if (status === 'suspended') {
      throw {
        status: 403,
        message: MESSAGES.landlordAccountSuspended,
        code: 'LANDLORD_SUSPENDED',
      };
    }
    if (status && status !== 'verified') {
      throw {
        status: 403,
        message: MESSAGES.landlordAccountUnverified,
        code: 'LANDLORD_LISTING_NOT_TRUSTED',
      };
    }
  },

  assertBookableProperty(property) {
    if (property.verification_status === 'suspended') {
      throw { status: 403, message: MESSAGES.propertySuspended, code: 'PROPERTY_SUSPENDED' };
    }
    if (property.verification_status === 'rejected') {
      throw { status: 400, message: MESSAGES.propertyNotVerified, code: 'PROPERTY_NOT_VERIFIED' };
    }
    this.assertVerifiedLandlordOnProperty(property);
  },

  assertMoveInDate(moveInDate) {
    const moveIn = new Date(moveInDate);
    if (Number.isNaN(moveIn.getTime())) {
      throw { status: 400, message: 'move_in_date must be a valid date' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    moveIn.setHours(0, 0, 0, 0);
    if (moveIn < today) {
      throw { status: 400, message: 'Move-in date cannot be in the past' };
    }
  },
};

module.exports = VerificationGate;
