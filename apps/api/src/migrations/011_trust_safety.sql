-- ============================================
-- ResiSure Migration 011
-- Trust & safety: extended verification states,
-- move-in codes, content reports, risk flags
-- ============================================

-- Account-level suspension (applies to all roles)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_account_status_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_account_status_check
      CHECK (account_status IN ('active', 'suspended'));
  END IF;
END $$;

-- Extended landlord verification metadata
ALTER TABLE landlord_profiles
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Extended student verification metadata
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Extend landlord verification_status constraint
ALTER TABLE landlord_profiles DROP CONSTRAINT IF EXISTS landlord_profiles_verification_status_check;
UPDATE landlord_profiles SET verification_status = 'pending' WHERE verification_status NOT IN (
  'pending', 'verified', 'rejected', 'suspended', 'expired'
);
ALTER TABLE landlord_profiles
  ADD CONSTRAINT landlord_profiles_verification_status_check
  CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended', 'expired'));

-- Extend student verification_status constraint
ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_verification_status_check;
UPDATE student_profiles SET verification_status = 'pending' WHERE verification_status NOT IN (
  'pending', 'verified', 'rejected', 'suspended', 'expired'
);
ALTER TABLE student_profiles
  ADD CONSTRAINT student_profiles_verification_status_check
  CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended', 'expired'));

-- Property verification: add suspended + audit fields
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;

ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_verification_status_check;
UPDATE properties SET verification_status = 'pending' WHERE verification_status NOT IN (
  'pending', 'under_review', 'verified', 'rejected', 'suspended'
);
ALTER TABLE properties
  ADD CONSTRAINT properties_verification_status_check
  CHECK (verification_status IN ('pending', 'under_review', 'verified', 'rejected', 'suspended'));

-- Move-in confirmation codes
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS move_in_code VARCHAR(12),
  ADD COLUMN IF NOT EXISTS move_in_code_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS move_in_code_used_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_bookings_move_in_code ON bookings (move_in_code)
  WHERE move_in_code IS NOT NULL;

-- Content reports (listings, users, bookings, etc.)
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(40) NOT NULL CHECK (entity_type IN ('property', 'user', 'booking', 'payment_request', 'other')),
  entity_id UUID,
  category VARCHAR(60) NOT NULL,
  description TEXT NOT NULL,
  evidence_url TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports (status);
CREATE INDEX IF NOT EXISTS idx_content_reports_entity ON content_reports (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON content_reports (reporter_id);

-- Risk flags for admin review (not auto-ban)
CREATE TABLE IF NOT EXISTS risk_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  flag_type VARCHAR(60) NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  reason TEXT NOT NULL,
  metadata JSONB,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'cleared', 'confirmed')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_flags_status ON risk_flags (status);
CREATE INDEX IF NOT EXISTS idx_risk_flags_user ON risk_flags (user_id);
CREATE INDEX IF NOT EXISTS idx_risk_flags_property ON risk_flags (property_id);
