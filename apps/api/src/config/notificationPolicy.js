/**
 * Which in-app notification types also trigger transactional email/SMS.
 * Email uses SMTP_FROM (existing product address).
 */
const EMAIL_NOTIFICATION_TYPES = new Set([
  'booking_submitted',
  'booking_created',
  'booking_accepted',
  'booking_rejected',
  'payment_success',
  'payment_failed',
  'payment_received',
  'move_in_window',
  'move_in_confirmed',
  'funds_released',
  'dispute_submitted',
  'dispute_raised',
  'dispute_resolved',
  'property_verification',
  'landlord_verification',
  'student_verification',
  'property_created',
]);

const SMS_NOTIFICATION_TYPES = new Set([
  'payment_success',
  'payment_failed',
  'payment_received',
  'move_in_window',
  'booking_accepted',
  'booking_rejected',
  'dispute_raised',
  'dispute_submitted',
]);

/** Minutes — suppress duplicate in-app + email for the same event */
const NOTIFICATION_DEDUPE_MINUTES = 5;

module.exports = {
  EMAIL_NOTIFICATION_TYPES,
  SMS_NOTIFICATION_TYPES,
  NOTIFICATION_DEDUPE_MINUTES,
};
