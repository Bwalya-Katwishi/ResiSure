const BookingModel = require('../models/booking.model');
const pool = require('../config/database');

// Generates a simulated transaction reference
const generateReference = () => {
  return `RSE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

const EscrowService = {

  // Student pays — funds move into escrow and move-in window opens
  async capturePayment(booking_id, actor_id) {
    const booking = await BookingModel.findById(booking_id);

    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (booking.status !== 'accepted') {
      throw { status: 400, message: `Cannot pay for a booking with status: ${booking.status}` };
    }
    if (String(booking.student_id) !== String(actor_id)) {
      throw { status: 403, message: 'Only the student who made this booking can pay' };
    }

    const moveInDate = new Date(booking.move_in_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    moveInDate.setHours(0, 0, 0, 0);

    if (moveInDate > today) {
      throw {
        status: 400,
        message: 'Payment is only available on or after your move-in date',
      };
    }

    const moveInWindowOpens = new Date(booking.move_in_date);
    const autoReleaseAt = new Date(moveInWindowOpens);
    autoReleaseAt.setHours(autoReleaseAt.getHours() + 72);

    const updated = await pool.query(
      `UPDATE bookings SET
        status = 'move_in_window',
        escrow_held_at = NOW(),
        move_in_window_opens_at = $1,
        auto_release_at = $2,
        updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [moveInWindowOpens, autoReleaseAt, booking_id]
    );

    const reference = generateReference();
    await BookingModel.createEscrowTransaction({
      booking_id,
      type: 'capture',
      amount: booking.amount,
      status: 'completed',
      reference,
    });

    await BookingModel.logAudit({
      booking_id,
      actor_id,
      from_status: 'accepted',
      to_status: 'move_in_window',
      reason: `Payment captured into escrow. Move-in window opened. Reference: ${reference}`,
    });

    return updated.rows[0];
  },

  // Transition escrow_held bookings when move-in date arrives
  async openMoveInWindows() {
    const result = await pool.query(
      `SELECT * FROM bookings
       WHERE status = 'escrow_held'
       AND move_in_window_opens_at IS NOT NULL
       AND move_in_window_opens_at <= NOW()`
    );

    for (const booking of result.rows) {
      await pool.query(
        `UPDATE bookings SET status = 'move_in_window', updated_at = NOW() WHERE id = $1`,
        [booking.id]
      );

      await BookingModel.logAudit({
        booking_id: booking.id,
        actor_id: booking.student_id,
        from_status: 'escrow_held',
        to_status: 'move_in_window',
        reason: 'Move-in date reached — confirmation window opened',
      });
    }
  },

  // Student confirms move-in — funds released to landlord
  async confirmMoveIn(booking_id, actor_id) {
    const booking = await BookingModel.findById(booking_id);

    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (booking.status !== 'move_in_window') {
      throw { status: 400, message: `Cannot confirm move-in for a booking with status: ${booking.status}` };
    }
    if (String(booking.student_id) !== String(actor_id)) {
      throw { status: 403, message: 'Only the student who made this booking can confirm move-in' };
    }

    // Update to confirmed
    await pool.query(
      `UPDATE bookings SET
        status = 'confirmed',
        confirmed_at = NOW(),
        updated_at = NOW()
       WHERE id = $1`,
      [booking_id]
    );

    // Release funds
    const reference = generateReference();
    await BookingModel.createEscrowTransaction({
      booking_id,
      type: 'release',
      amount: booking.amount,
      status: 'completed',
      reference,
    });

    // Mark as completed
    await pool.query(
      `UPDATE bookings SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [booking_id]
    );

    // Audit log
    await BookingModel.logAudit({
      booking_id,
      actor_id,
      from_status: 'move_in_window',
      to_status: 'completed',
      reason: `Student confirmed move-in. Funds released to landlord. Reference: ${reference}`,
    });

    return await BookingModel.findById(booking_id);
  },

  // Student raises a dispute — funds frozen
  async raiseDispute(booking_id, actor_id, reason) {
    const booking = await BookingModel.findById(booking_id);

    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (booking.status !== 'move_in_window') {
      throw { status: 400, message: 'Disputes can only be raised during the move-in window' };
    }
    if (String(booking.student_id) !== String(actor_id)) {
      throw { status: 403, message: 'Only the student who made this booking can raise a dispute' };
    }

    if (!reason) throw { status: 400, message: 'A reason is required to raise a dispute' };

    // Freeze the booking
    await pool.query(
      `UPDATE bookings SET status = 'disputed', updated_at = NOW() WHERE id = $1`,
      [booking_id]
    );

    // Create dispute record
    await pool.query(
      `INSERT INTO disputes (booking_id, raised_by, reason, resolution)
       VALUES ($1, $2, $3, 'pending')`,
      [booking_id, actor_id, reason]
    );

    // Audit log
    await BookingModel.logAudit({
      booking_id,
      actor_id,
      from_status: 'move_in_window',
      to_status: 'disputed',
      reason: `Dispute raised: ${reason}`,
    });

    return await BookingModel.findById(booking_id);
  },

  // Admin resolves a dispute
  async resolveDispute(booking_id, admin_id, resolution) {
    const booking = await BookingModel.findById(booking_id);

    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (booking.status !== 'disputed') {
      throw { status: 400, message: 'This booking is not in a disputed state' };
    }

    if (!['refunded', 'released'].includes(resolution)) {
      throw { status: 400, message: 'Resolution must be either refunded or released' };
    }

    const finalStatus = resolution === 'refunded' ? 'refunded' : 'completed';
    const transactionType = resolution === 'refunded' ? 'refund' : 'release';

    // Update booking status
    await pool.query(
      `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2`,
      [finalStatus, booking_id]
    );

    // Record transaction
    const reference = generateReference();
    await BookingModel.createEscrowTransaction({
      booking_id,
      type: transactionType,
      amount: booking.amount,
      status: 'completed',
      reference,
    });

    // Update dispute record
    await pool.query(
      `UPDATE disputes SET 
        resolution = $1, 
        resolved_by = $2, 
        resolved_at = NOW()
       WHERE booking_id = $3`,
      [resolution, admin_id, booking_id]
    );

    // Audit log
    await BookingModel.logAudit({
      booking_id,
      actor_id: admin_id,
      from_status: 'disputed',
      to_status: finalStatus,
      reason: `Admin resolved dispute as: ${resolution}. Reference: ${reference}`,
    });

    return await BookingModel.findById(booking_id);
  },

  // Called by cron job — auto-release expired escrows
  async autoReleaseExpired() {
    const expiredBookings = await BookingModel.findExpiredEscrows();

    if (expiredBookings.length === 0) return;

    console.log(`⏰ Auto-releasing ${expiredBookings.length} expired escrow(s)...`);

    for (const booking of expiredBookings) {
      try {
        // Update to timed_out first then completed
        await pool.query(
          `UPDATE bookings SET 
            status = 'timed_out', 
            updated_at = NOW() 
           WHERE id = $1`,
          [booking.id]
        );

        const reference = generateReference();
        await BookingModel.createEscrowTransaction({
          booking_id: booking.id,
          type: 'release',
          amount: booking.amount,
          status: 'completed',
          reference,
        });

        await pool.query(
          `UPDATE bookings SET status = 'completed', updated_at = NOW() WHERE id = $1`,
          [booking.id]
        );

        await BookingModel.logAudit({
          booking_id: booking.id,
          actor_id: booking.student_id,
          from_status: 'move_in_window',
          to_status: 'completed',
          reason: `Auto-released after 72hr timeout. Reference: ${reference}`,
        });

        console.log(`  ✅ Booking ${booking.id} auto-released`);
      } catch (err) {
        console.error(`  ❌ Failed to auto-release booking ${booking.id}:`, err.message);
      }
    }
  },

};

module.exports = EscrowService;