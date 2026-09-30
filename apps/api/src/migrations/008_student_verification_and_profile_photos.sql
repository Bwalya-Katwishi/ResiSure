-- Split landlord verification documents, add student profiles, profile photos

ALTER TABLE landlord_profiles
  ADD COLUMN IF NOT EXISTS nrc_doc_url TEXT,
  ADD COLUMN IF NOT EXISTS land_doc_url TEXT;

UPDATE landlord_profiles
SET land_doc_url = verification_doc_url
WHERE land_doc_url IS NULL AND verification_doc_url IS NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  nrc_number VARCHAR(50),
  nrc_doc_url TEXT,
  university_slip_url TEXT,
  verification_status VARCHAR(20) DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_verification_status ON student_profiles(verification_status);

INSERT INTO student_profiles (user_id)
SELECT u.id FROM users u
WHERE u.role = 'student'
  AND NOT EXISTS (SELECT 1 FROM student_profiles sp WHERE sp.user_id = u.id);
