-- Unique completed capture per booking (prevents double-pay ledger rows)
CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_one_capture_per_booking
  ON escrow_transactions (booking_id)
  WHERE type = 'capture' AND status = 'completed';
