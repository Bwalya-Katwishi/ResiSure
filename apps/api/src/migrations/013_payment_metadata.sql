-- Payment metadata for provider reconciliation and idempotency

ALTER TABLE escrow_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);

ALTER TABLE escrow_transactions
  ADD COLUMN IF NOT EXISTS provider_status VARCHAR(40);

ALTER TABLE escrow_transactions
  ADD COLUMN IF NOT EXISTS provider_payload JSONB;

ALTER TABLE escrow_transactions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE escrow_transactions
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_capture_idempotency
  ON escrow_transactions (booking_id, idempotency_key)
  WHERE type = 'capture' AND idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escrow_capture_pending
  ON escrow_transactions (status, updated_at)
  WHERE type = 'capture' AND status = 'pending';
