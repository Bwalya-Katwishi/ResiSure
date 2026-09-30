const pool = require('../config/database');

const DISCLAIMER = 'ResiSure verifies listings and identities through manual review. '
  + 'These signals reflect platform records only and do not guarantee a problem-free stay. '
  + 'ResiSure uses an escrow-style protected payment workflow; it is not a financial institution '
  + 'and does not independently hold customer funds.';

async function countCompletedBookings(landlordProfileId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM bookings b
     JOIN properties p ON p.id = b.property_id
     WHERE p.landlord_id = $1 AND b.status = 'completed'`,
    [landlordProfileId]
  );
  return result.rows[0]?.count || 0;
}

async function countResolvedDisputes(landlordProfileId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM disputes d
     JOIN bookings b ON b.id = d.booking_id
     JOIN properties p ON p.id = b.property_id
     WHERE p.landlord_id = $1 AND d.resolution IN ('refunded', 'released')`,
    [landlordProfileId]
  );
  return result.rows[0]?.count || 0;
}

function buildSignals({ verificationStatus, verifiedAt, verificationExpiresAt, completedBookings, resolvedDisputes, accountCreatedAt }) {
  const signals = [];

  if (verificationStatus === 'verified') {
    signals.push({
      key: 'identity_verified',
      label: 'Identity verified',
      status: 'positive',
      detail: verifiedAt
        ? `Manually verified on ${new Date(verifiedAt).toISOString().slice(0, 10)}`
        : 'Manually verified by ResiSure admin',
    });
    if (verificationExpiresAt && new Date(verificationExpiresAt) < new Date()) {
      signals.push({
        key: 'verification_expired',
        label: 'Verification expired',
        status: 'warning',
        detail: `Verification expired on ${new Date(verificationExpiresAt).toISOString().slice(0, 10)}`,
      });
    }
  } else if (verificationStatus === 'pending') {
    signals.push({
      key: 'identity_pending',
      label: 'Identity verification pending',
      status: 'neutral',
      detail: 'Documents submitted and awaiting admin review',
    });
  } else if (verificationStatus === 'rejected') {
    signals.push({
      key: 'identity_rejected',
      label: 'Identity verification rejected',
      status: 'negative',
      detail: 'Verification was rejected by admin review',
    });
  } else if (verificationStatus === 'suspended') {
    signals.push({
      key: 'account_suspended',
      label: 'Account suspended',
      status: 'negative',
      detail: 'This account is suspended and cannot receive new bookings or payments',
    });
  }

  if (completedBookings > 0) {
    signals.push({
      key: 'completed_bookings',
      label: 'Completed bookings',
      status: 'positive',
      detail: `${completedBookings} booking(s) completed on the platform`,
    });
  }

  if (resolvedDisputes > 0) {
    signals.push({
      key: 'resolved_disputes',
      label: 'Resolved disputes',
      status: 'neutral',
      detail: `${resolvedDisputes} dispute(s) resolved through admin review`,
    });
  }

  if (accountCreatedAt) {
    const ageDays = Math.floor((Date.now() - new Date(accountCreatedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays >= 30) {
      signals.push({
        key: 'account_age',
        label: 'Account age',
        status: 'neutral',
        detail: `Account created ${ageDays} day(s) ago`,
      });
    }
  }

  return signals;
}

const TrustProfileService = {
  disclaimer: DISCLAIMER,

  async getLandlordTrustProfile(landlordUserId) {
    const result = await pool.query(
      `SELECT u.id AS user_id, u.full_name, u.created_at AS account_created_at,
              lp.id AS profile_id, lp.verification_status, lp.verified_at, lp.verification_expires_at
       FROM users u
       JOIN landlord_profiles lp ON lp.user_id = u.id
       WHERE u.id = $1 AND u.role = 'landlord'`,
      [landlordUserId]
    );
    if (!result.rows[0]) throw { status: 404, message: 'Landlord not found' };

    const row = result.rows[0];
    const completedBookings = await countCompletedBookings(row.profile_id);
    const resolvedDisputes = await countResolvedDisputes(row.profile_id);

    const signals = buildSignals({
      verificationStatus: row.verification_status,
      verifiedAt: row.verified_at,
      verificationExpiresAt: row.verification_expires_at,
      completedBookings,
      resolvedDisputes,
      accountCreatedAt: row.account_created_at,
    });

    return {
      entity_type: 'landlord',
      entity_id: row.user_id,
      display_name: row.full_name,
      verification_status: row.verification_status,
      is_trusted_for_booking: row.verification_status === 'verified'
        && (!row.verification_expires_at || new Date(row.verification_expires_at) > new Date()),
      signals,
      disclaimer: DISCLAIMER,
    };
  },

  async getPropertyTrustProfile(propertyId) {
    const result = await pool.query(
      `SELECT p.id, p.title, p.verification_status, p.verified_at, p.verification_expires_at,
              p.submitted_for_review_at, lp.verification_status AS landlord_verification_status,
              u.id AS landlord_user_id, u.full_name AS landlord_name
       FROM properties p
       JOIN landlord_profiles lp ON lp.id = p.landlord_id
       JOIN users u ON u.id = lp.user_id
       WHERE p.id = $1`,
      [propertyId]
    );
    if (!result.rows[0]) throw { status: 404, message: 'Property not found' };

    const row = result.rows[0];
    const signals = [];

    if (row.verification_status === 'verified') {
      signals.push({
        key: 'listing_verified',
        label: 'Listing verified',
        status: 'positive',
        detail: row.verified_at
          ? `Listing approved on ${new Date(row.verified_at).toISOString().slice(0, 10)}`
          : 'Listing approved by ResiSure admin',
      });
    } else if (row.verification_status === 'suspended') {
      signals.push({
        key: 'listing_suspended',
        label: 'Listing suspended',
        status: 'negative',
        detail: 'This listing is suspended and cannot receive new bookings',
      });
    } else {
      signals.push({
        key: 'listing_not_verified',
        label: 'Listing not yet verified',
        status: 'neutral',
        detail: 'This listing has not completed admin verification',
      });
    }

    if (row.landlord_verification_status === 'verified') {
      signals.push({
        key: 'landlord_verified',
        label: 'Verified landlord',
        status: 'positive',
        detail: `${row.landlord_name} has passed identity verification`,
      });
    } else {
      signals.push({
        key: 'landlord_not_verified',
        label: 'Landlord verification incomplete',
        status: 'warning',
        detail: 'The landlord account has not completed verification',
      });
    }

    const landlordProfile = await pool.query(
      'SELECT id FROM landlord_profiles WHERE user_id = $1',
      [row.landlord_user_id]
    );
    const completedBookings = landlordProfile.rows[0]
      ? await countCompletedBookings(landlordProfile.rows[0].id)
      : 0;

    if (completedBookings > 0) {
      signals.push({
        key: 'landlord_completed_bookings',
        label: 'Landlord track record',
        status: 'positive',
        detail: `${completedBookings} completed booking(s) for this landlord`,
      });
    }

    return {
      entity_type: 'property',
      entity_id: row.id,
      display_name: row.title,
      verification_status: row.verification_status,
      is_trusted_for_booking: row.verification_status === 'verified'
        && row.landlord_verification_status === 'verified'
        && (!row.verification_expires_at || new Date(row.verification_expires_at) > new Date()),
      signals,
      disclaimer: DISCLAIMER,
    };
  },
};

module.exports = TrustProfileService;
