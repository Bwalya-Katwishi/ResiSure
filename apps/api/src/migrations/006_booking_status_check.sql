-- Align booking status check with the current workflow.
-- CREATE TABLE IF NOT EXISTS in 001 does not update an older constraint.

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check CHECK (status IN (
    'pending',
    'accepted',
    'rejected',
    'escrow_held',
    'move_in_window',
    'timed_out',
    'confirmed',
    'disputed',
    'completed',
    'cancelled',
    'refunded'
  ));
