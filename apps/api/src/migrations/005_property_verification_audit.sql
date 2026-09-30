-- ============================================
-- ResiSure Migration 005
-- Property verification, listing metadata, platform audit log,
-- and escrow uniqueness for release/refund
-- ============================================

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS property_type VARCHAR(40) DEFAULT 'room';

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS submitted_for_review_at TIMESTAMP;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_verification_status_check'
  ) THEN
    ALTER TABLE properties
      ADD CONSTRAINT properties_verification_status_check
      CHECK (verification_status IN ('pending', 'under_review', 'verified', 'rejected'));
  END IF;
END $$;

-- First-time backfill only: if nothing is verified yet, keep existing public listings usable
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM properties WHERE verification_status = 'verified') THEN
    UPDATE properties
    SET verification_status = 'verified',
        verified_at = COALESCE(verified_at, NOW());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_one_release_per_booking
  ON escrow_transactions (booking_id)
  WHERE type = 'release' AND status = 'completed';

CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_one_refund_per_booking
  ON escrow_transactions (booking_id)
  WHERE type = 'refund' AND status = 'completed';

CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_one_capture_row_per_booking
  ON escrow_transactions (booking_id)
  WHERE type = 'capture';

CREATE INDEX IF NOT EXISTS idx_properties_area ON properties (LOWER(area));
CREATE INDEX IF NOT EXISTS idx_properties_rent ON properties (rent_per_month);
CREATE INDEX IF NOT EXISTS idx_properties_verification ON properties (verification_status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties (property_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);
