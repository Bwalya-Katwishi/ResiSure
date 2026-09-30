-- Who a listing is intended for (female / male / both) with optional per-gender room counts
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS accommodation_gender VARCHAR(10),
  ADD COLUMN IF NOT EXISTS female_rooms_available INT,
  ADD COLUMN IF NOT EXISTS male_rooms_available INT;

UPDATE properties
SET accommodation_gender = 'both'
WHERE accommodation_gender IS NULL;

ALTER TABLE properties
  ALTER COLUMN accommodation_gender SET DEFAULT 'both';

ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_accommodation_gender_check;
ALTER TABLE properties
  ADD CONSTRAINT properties_accommodation_gender_check
  CHECK (accommodation_gender IN ('female', 'male', 'both'));

CREATE INDEX IF NOT EXISTS idx_properties_accommodation_gender ON properties (accommodation_gender);
