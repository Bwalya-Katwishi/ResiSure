const VERIFICATION_LABELS = {
  verified: 'Verified',
  pending: 'Pending',
  under_review: 'Under review',
  rejected: 'Rejected',
};

const LISTING_VERIFICATION_LABELS = {
  verified: 'Verified',
  pending: 'Unverified',
  under_review: 'Under review',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

function verificationLabel(status) {
  return VERIFICATION_LABELS[status] || 'Pending';
}

function listingVerificationLabel(status) {
  return LISTING_VERIFICATION_LABELS[status] || 'Unverified';
}

module.exports = {
  VERIFICATION_LABELS,
  LISTING_VERIFICATION_LABELS,
  verificationLabel,
  listingVerificationLabel,
};
