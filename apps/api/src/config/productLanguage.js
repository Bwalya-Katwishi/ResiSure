/**
 * Approved product language for payments and protection.
 * ResiSure is not a financial institution and does not independently hold customer funds.
 */

const PAYMENT_PROTECTION = {
  /** Preferred platform description */
  workflow:
    'ResiSure uses an escrow-style protected payment workflow that holds accommodation payments pending student move-in confirmation.',

  /** Short label for notifications */
  label: 'escrow-style protected payment',

  heldForStudent: (propertyTitle) => (
    `Your escrow-style protected payment for ${propertyTitle} is held pending move-in confirmation. Confirm within 72 hours when your move-in window opens, or raise a dispute.`
  ),

  heldForLandlord: (amount, propertyTitle) => (
    `An escrow-style protected payment of ZMW ${Number(amount).toLocaleString()} for ${propertyTitle} is held pending student move-in confirmation. You will be paid after confirmation or per the auto-release policy.`
  ),

  providerNote:
    'Payments are collected through the configured mobile-money provider (MTN MoMo or Airtel Money). ResiSure does not independently hold customer funds as a financial institution.',
};

const AUTO_RELEASE = {
  hours: 72,
  summary:
    'If the student takes no action within 72 hours after the move-in confirmation window opens on the scheduled move-in date, funds may be released unless an active dispute or unresolved payment issue exists.',
};

module.exports = { PAYMENT_PROTECTION, AUTO_RELEASE };
