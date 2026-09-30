-- Prevent duplicate active bookings per student/property (double-click / retry safety)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_one_active_student_property
  ON bookings (student_id, property_id)
  WHERE status IN ('pending', 'accepted', 'escrow_held', 'move_in_window', 'disputed');

-- Speed up active booking counts per property inside locked transactions
CREATE INDEX IF NOT EXISTS idx_bookings_active_by_property
  ON bookings (property_id)
  WHERE status IN ('pending', 'accepted', 'escrow_held', 'move_in_window', 'disputed');
