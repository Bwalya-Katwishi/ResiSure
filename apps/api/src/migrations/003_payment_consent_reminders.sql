-- ============================================
-- ResiSure Migration 003
-- Mobile money metadata, consent, deadline reminders
-- ============================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMP;

ALTER TABLE escrow_transactions
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20);

ALTER TABLE escrow_transactions
  ADD COLUMN IF NOT EXISTS payer_phone VARCHAR(20);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;
