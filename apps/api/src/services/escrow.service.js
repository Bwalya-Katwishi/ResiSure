const BookingModel = require('../models/booking.model');
const PropertyModel = require('../models/property.model');
const NotificationService = require('./notification.service');
const PaymentService = require('./payment.service');
const AuditService = require('./audit.service');
const { PAYMENT_PROTECTION } = require('../config/productLanguage');
const pool = require('../config/database');
const { sanitizeProviderPayload } = require('./payments/providerUtils');

const generateReference = () => {
  return `RSE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

function isMoveInTodayOrPast(moveInDate) {
  const moveIn = new Date(moveInDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  moveIn.setHours(0, 0, 0, 0);
  return moveIn <= today;
}

function heldStatusFor(moveInDate) {
  return isMoveInTodayOrPast(moveInDate) ? 'move_in_window' : 'escrow_held';
}

function autoReleaseFromNow() {
  const at = new Date();
  at.setHours(at.getHours() + 72);
  return at;
}

async function attachLedger(bookingId) {
  const full = await BookingModel.findById(bookingId);
  if (full) {
    full.transactions = await BookingModel.findTransactionsByBookingId(bookingId);
  }
  return full;
}

const EscrowService = {

  async capturePayment(booking_id, actor_id, { phone, outcome, provider: forcedProvider } = {}) {
    const booking = await BookingModel.findById(booking_id);

    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (String(booking.student_id) !== String(actor_id)) {
      throw { status: 403, message: 'Only the student who made this booking can pay' };
    }
    if (booking.status !== 'accepted') {
      throw { status: 400, message: `Cannot pay for a booking with status: ${booking.status}` };
    }

    const moveInWindowOpens = new Date(booking.move_in_date);
    const nextStatus = heldStatusFor(booking.move_in_date);
    const autoReleaseAt = nextStatus === 'move_in_window' ? autoReleaseFromNow() : null;

    const client = await pool.connect();
    let payment;
    try {
      await client.query('BEGIN');

      const locked = await client.query(
        `SELECT id, status, amount, student_id, property_id, move_in_date
         FROM bookings
         WHERE id = $1 AND status = 'accepted'
         FOR UPDATE`,
        [booking_id]
      );

      if (locked.rows.length === 0) {
        await client.query('ROLLBACK');
        throw {
          status: 409,
          message: 'Payment already processed or booking is no longer payable',
        };
      }

      const existingCapture = await client.query(
        `SELECT id, status, reference FROM escrow_transactions
         WHERE booking_id = $1 AND type = 'capture'
         FOR UPDATE`,
        [booking_id]
      );

      if (existingCapture.rows[0]?.status === 'completed') {
        await client.query('ROLLBACK');
        throw { status: 409, message: 'Payment already processed for this booking' };
      }

      const idempotencyKey = `capture-${booking_id}`;

      payment = await PaymentService.initiatePayment({
        amount: booking.amount,
        phone,
        outcome,
        bookingId: booking_id,
        idempotencyKey,
        provider: forcedProvider,
      });

      await AuditService.log({
        actor_id,
        action: 'PAYMENT_INITIATED',
        entity_type: 'booking',
        entity_id: booking_id,
        metadata: {
          amount: booking.amount,
          provider: payment.provider,
          outcome: payment.status,
        },
      });

      if (payment.status === 'failed') {
        await client.query('COMMIT');
        await NotificationService.create({
          user_id: booking.student_id,
          type: 'payment_failed',
          message: `Payment of ZMW ${Number(booking.amount).toLocaleString()} for ${booking.property_title} failed. You can try again.`,
          link: `/bookings/${booking_id}`,
        });
        throw {
          status: 402,
          message: payment.message || 'Payment failed',
        };
      }

      const reference = payment.reference || generateReference();

      const captureStatus = payment.status === 'success' ? 'completed' : 'pending';
      const providerPayload = sanitizeProviderPayload(payment.raw || null);

      if (existingCapture.rows[0]) {
        await client.query(
          `UPDATE escrow_transactions
           SET status = $1,
               reference = $2,
               payment_provider = $3,
               payer_phone = $4,
               idempotency_key = $5,
               provider_status = $6,
               provider_payload = $7,
               updated_at = NOW(),
               confirmed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE confirmed_at END
           WHERE id = $8`,
          [
            captureStatus,
            reference,
            payment.provider,
            payment.phone,
            idempotencyKey,
            payment.status,
            providerPayload,
            existingCapture.rows[0].id,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO escrow_transactions
            (booking_id, type, amount, status, reference, payment_provider, payer_phone,
             idempotency_key, provider_status, provider_payload, confirmed_at)
           VALUES ($1, 'capture', $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            booking_id,
            booking.amount,
            captureStatus,
            reference,
            payment.provider,
            payment.phone,
            idempotencyKey,
            payment.status,
            providerPayload,
            captureStatus === 'completed' ? new Date() : null,
          ]
        );
      }

      if (payment.status === 'pending') {
        await client.query(
          `INSERT INTO booking_audit_log
            (booking_id, actor_id, from_status, to_status, reason)
           VALUES ($1, $2, 'accepted', 'accepted', $3)`,
          [booking_id, actor_id, `${payment.provider_label || payment.provider} pending. Reference: ${reference}`]
        );
        await client.query('COMMIT');

        const full = await attachLedger(booking_id);
        full.payment = payment;
        return full;
      }

      const updated = await client.query(
        `UPDATE bookings SET
          status = $1,
          escrow_held_at = NOW(),
          move_in_window_opens_at = $2,
          auto_release_at = $3,
          updated_at = NOW()
         WHERE id = $4 AND status = 'accepted'
         RETURNING *`,
        [
          nextStatus,
          moveInWindowOpens,
          autoReleaseAt,
          booking_id,
        ]
      );

      if (updated.rows.length === 0) {
        await client.query('ROLLBACK');
        throw {
          status: 409,
          message: 'Payment already processed or booking is no longer payable',
        };
      }

      await client.query(
        `INSERT INTO booking_audit_log
          (booking_id, actor_id, from_status, to_status, reason)
         VALUES ($1, $2, 'accepted', $3, $4)`,
        [
          booking_id,
          actor_id,
          nextStatus,
          `${payment.provider_label || payment.provider} captured into escrow. Landlord is not paid yet. Reference: ${reference}`,
        ]
      );

      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) { /* already rolled back */ }
      if (err.code === '23505') {
        throw {
          status: 409,
          message: 'Payment already processed for this booking',
        };
      }
      throw err;
    } finally {
      client.release();
    }

    if (payment.status === 'success') {
      await AuditService.log({
        actor_id,
        action: 'PAYMENT_CONFIRMED',
        entity_type: 'booking',
        entity_id: booking_id,
        metadata: { amount: booking.amount, provider: payment.provider, reference: payment.reference },
      });
      await AuditService.log({
        actor_id,
        action: 'ESCROW_CREATED',
        entity_type: 'booking',
        entity_id: booking_id,
        metadata: { amount: booking.amount, status: nextStatus },
      });

      const landlordUserId = await PropertyModel.getLandlordUserIdByPropertyId(booking.property_id);
      await NotificationService.create({
        user_id: landlordUserId,
        type: 'payment_received',
        message: PAYMENT_PROTECTION.heldForLandlord(booking.amount, booking.property_title),
        link: `/bookings/${booking_id}`,
      });
      const moveInMsg = PAYMENT_PROTECTION.heldForStudent(booking.property_title);
      await NotificationService.create({
        user_id: booking.student_id,
        type: 'payment_success',
        message: moveInMsg,
        link: `/bookings/${booking_id}`,
      });
    }

    const full = await attachLedger(booking_id);
    full.payment = payment;
    return full;
  },

  async completePendingPayment(booking_id, actor_id, { outcome = 'success' } = {}) {
    const booking = await BookingModel.findById(booking_id);
    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (String(booking.student_id) !== String(actor_id) && actor_id !== 'system') {
      throw { status: 403, message: 'Only the student who made this booking can complete payment' };
    }
    if (booking.status !== 'accepted') {
      throw { status: 400, message: 'No pending payment to complete for this booking' };
    }

    if (outcome === 'failed') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const pending = await client.query(
          `DELETE FROM escrow_transactions
           WHERE booking_id = $1 AND type = 'capture' AND status = 'pending'
           RETURNING id`,
          [booking_id]
        );
        if (pending.rows.length === 0) {
          await client.query('ROLLBACK');
          throw { status: 404, message: 'No pending payment found' };
        }
        await client.query('COMMIT');
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
        throw err;
      } finally {
        client.release();
      }

      await NotificationService.create({
        user_id: booking.student_id,
        type: 'payment_failed',
        message: `Pending payment for ${booking.property_title} failed. You can try again.`,
        link: `/bookings/${booking_id}`,
      });
      throw { status: 402, message: 'Pending payment was marked failed. You can initiate a new payment.' };
    }

    return this.finalizePendingCapture(booking_id, { status: 'success' });
  },

  async finalizeByReference(reference, status) {
    const row = await pool.query(
      `SELECT booking_id FROM escrow_transactions
       WHERE reference = $1 AND type = 'capture'`,
      [reference]
    );
    if (!row.rows[0]) {
      throw { status: 404, message: 'No capture found for that provider reference' };
    }
    return this.finalizePendingCapture(row.rows[0].booking_id, { status, reference });
  },

  async finalizePendingCapture(booking_id, { status = 'success', reference } = {}) {
    const booking = await BookingModel.findById(booking_id);
    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (booking.status !== 'accepted') {
      const full = await attachLedger(booking_id);
      return full;
    }

    if (status === 'failed') {
      return this.completePendingPayment(booking_id, 'system', { outcome: 'failed' });
    }

    const moveInWindowOpens = new Date(booking.move_in_date);
    const nextStatus = heldStatusFor(booking.move_in_date);
    const autoReleaseAt = nextStatus === 'move_in_window' ? autoReleaseFromNow() : null;
    const actorId = booking.student_id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await client.query(
        `SELECT id, status FROM bookings WHERE id = $1 AND status = 'accepted' FOR UPDATE`,
        [booking_id]
      );
      if (locked.rows.length === 0) {
        await client.query('ROLLBACK');
        return attachLedger(booking_id);
      }

      const pending = await client.query(
        `SELECT id, reference, status FROM escrow_transactions
         WHERE booking_id = $1 AND type = 'capture'
         FOR UPDATE`,
        [booking_id]
      );
      if (!pending.rows[0]) {
        await client.query('ROLLBACK');
        throw { status: 404, message: 'No pending payment found' };
      }
      if (pending.rows[0].status === 'completed') {
        await client.query('ROLLBACK');
        return attachLedger(booking_id);
      }

      const finalRef = reference || pending.rows[0].reference;
      await client.query(
        `UPDATE escrow_transactions SET status = 'completed', reference = $1 WHERE id = $2`,
        [finalRef, pending.rows[0].id]
      );

      const updated = await client.query(
        `UPDATE bookings SET
          status = $1,
          escrow_held_at = NOW(),
          move_in_window_opens_at = $2,
          auto_release_at = $3,
          updated_at = NOW()
         WHERE id = $4 AND status = 'accepted'
         RETURNING *`,
        [
          nextStatus,
          moveInWindowOpens,
          autoReleaseAt,
          booking_id,
        ]
      );
      if (updated.rows.length === 0) {
        await client.query('ROLLBACK');
        return attachLedger(booking_id);
      }

      await client.query(
        `INSERT INTO booking_audit_log
          (booking_id, actor_id, from_status, to_status, reason)
         VALUES ($1, $2, 'accepted', $3, $4)`,
        [booking_id, actorId, nextStatus, `Provider callback confirmed escrow hold. Reference: ${finalRef}`]
      );
      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
      throw err;
    } finally {
      client.release();
    }

    await AuditService.log({
      actor_id: actorId,
      action: 'PAYMENT_CONFIRMED',
      entity_type: 'booking',
      entity_id: booking_id,
      metadata: { amount: booking.amount, reference },
    });
    await NotificationService.create({
      user_id: booking.student_id,
      type: 'payment_success',
      message: PAYMENT_PROTECTION.heldForStudent(booking.property_title),
      link: `/bookings/${booking_id}`,
    });
    const landlordUserId = await PropertyModel.getLandlordUserIdByPropertyId(booking.property_id);
    if (landlordUserId) {
      await NotificationService.create({
        user_id: landlordUserId,
        type: 'payment_received',
        message: PAYMENT_PROTECTION.heldForLandlord(booking.amount, booking.property_title),
        link: `/bookings/${booking_id}`,
      });
    }
    return attachLedger(booking_id);
  },

  async openMoveInWindows() {
    const result = await pool.query(
      `SELECT * FROM bookings
       WHERE status = 'escrow_held'
       AND move_in_window_opens_at IS NOT NULL
       AND move_in_window_opens_at <= NOW()`
    );

    for (const booking of result.rows) {
      const autoReleaseAt = autoReleaseFromNow();
      const updated = await pool.query(
        `UPDATE bookings SET
          status = 'move_in_window',
          auto_release_at = $1,
          updated_at = NOW()
         WHERE id = $2 AND status = 'escrow_held'
         RETURNING id`,
        [autoReleaseAt, booking.id]
      );
      if (updated.rows.length === 0) continue;

      await BookingModel.logAudit({
        booking_id: booking.id,
        actor_id: booking.student_id,
        from_status: 'escrow_held',
        to_status: 'move_in_window',
        reason: 'Move-in date reached — confirmation window opened',
      });

      await NotificationService.create({
        user_id: booking.student_id,
        type: 'move_in_window',
        message: `Your move-in window is open. Confirm move-in or raise a dispute within 72 hours.`,
        link: `/bookings/${booking.id}`,
      });
    }
  },

  async confirmMoveIn(booking_id, actor_id) {
    const booking = await BookingModel.findById(booking_id);

    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (String(booking.student_id) !== String(actor_id)) {
      throw { status: 403, message: 'Only the student who made this booking can confirm move-in' };
    }
    if (booking.status !== 'move_in_window') {
      throw { status: 400, message: `Cannot confirm move-in for a booking with status: ${booking.status}` };
    }

    const client = await pool.connect();
    let reference;
    try {
      await client.query('BEGIN');

      const locked = await client.query(
        `SELECT id, status, amount, student_id, property_id
         FROM bookings
         WHERE id = $1
         FOR UPDATE`,
        [booking_id]
      );

      if (locked.rows.length === 0) {
        await client.query('ROLLBACK');
        throw { status: 404, message: 'Booking not found' };
      }

      if (locked.rows[0].status !== 'move_in_window') {
        await client.query('ROLLBACK');
        throw { status: 400, message: `Cannot confirm move-in for a booking with status: ${locked.rows[0].status}` };
      }

      const existingRelease = await client.query(
        `SELECT id FROM escrow_transactions
         WHERE booking_id = $1 AND type = 'release' AND status = 'completed'`,
        [booking_id]
      );
      if (existingRelease.rows.length > 0) {
        await client.query('ROLLBACK');
        throw { status: 409, message: 'Escrow has already been released for this booking' };
      }

      await client.query(
        `UPDATE bookings SET
          status = 'completed',
          confirmed_at = NOW(),
          updated_at = NOW()
         WHERE id = $1 AND status = 'move_in_window'`,
        [booking_id]
      );

      reference = generateReference();
      await client.query(
        `INSERT INTO escrow_transactions
          (booking_id, type, amount, status, reference)
         VALUES ($1, 'release', $2, 'completed', $3)`,
        [booking_id, booking.amount, reference]
      );

      await client.query(
        `INSERT INTO booking_audit_log
          (booking_id, actor_id, from_status, to_status, reason)
         VALUES ($1, $2, 'move_in_window', 'completed', $3)`,
        [
          booking_id,
          actor_id,
          `Student confirmed move-in. Funds released to landlord. Reference: ${reference}`,
        ]
      );

      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
      if (err.code === '23505') {
        throw { status: 409, message: 'Escrow has already been released for this booking' };
      }
      throw err;
    } finally {
      client.release();
    }

    await AuditService.log({
      actor_id,
      action: 'MOVE_IN_CONFIRMED',
      entity_type: 'booking',
      entity_id: booking_id,
      metadata: { amount: booking.amount },
    });
    await AuditService.log({
      actor_id,
      action: 'ESCROW_RELEASED',
      entity_type: 'booking',
      entity_id: booking_id,
      metadata: { amount: booking.amount, reference },
    });

    const landlordUserId = await PropertyModel.getLandlordUserIdByPropertyId(booking.property_id);
    await NotificationService.create({
      user_id: landlordUserId,
      type: 'move_in_confirmed',
      message: `Student confirmed move-in for ${booking.property_title}. Escrow funds have been released.`,
      link: `/bookings/${booking_id}`,
    });
    await NotificationService.create({
      user_id: booking.student_id,
      type: 'move_in_confirmed',
      message: `Move-in confirmed for ${booking.property_title}. Your booking is complete and escrow funds were released to the landlord.`,
      link: `/bookings/${booking_id}`,
    });

    return attachLedger(booking_id);
  },

  async raiseDispute(booking_id, actor_id, reason) {
    const booking = await BookingModel.findById(booking_id);

    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (String(booking.student_id) !== String(actor_id)) {
      throw { status: 403, message: 'Only the student who made this booking can raise a dispute' };
    }
    if (!reason || !String(reason).trim()) {
      throw { status: 400, message: 'A reason is required to raise a dispute' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const locked = await client.query(
        `SELECT id, status FROM bookings WHERE id = $1 FOR UPDATE`,
        [booking_id]
      );
      if (locked.rows.length === 0) {
        await client.query('ROLLBACK');
        throw { status: 404, message: 'Booking not found' };
      }
      if (locked.rows[0].status !== 'move_in_window') {
        await client.query('ROLLBACK');
        throw { status: 400, message: 'Disputes can only be raised during the move-in window' };
      }

      await client.query(
        `UPDATE bookings SET status = 'disputed', updated_at = NOW()
         WHERE id = $1 AND status = 'move_in_window'`,
        [booking_id]
      );

      await client.query(
        `INSERT INTO disputes (booking_id, raised_by, reason, resolution)
         VALUES ($1, $2, $3, 'pending')`,
        [booking_id, actor_id, String(reason).trim()]
      );

      await client.query(
        `INSERT INTO booking_audit_log
          (booking_id, actor_id, from_status, to_status, reason)
         VALUES ($1, $2, 'move_in_window', 'disputed', $3)`,
        [booking_id, actor_id, `Dispute raised: ${String(reason).trim()}`]
      );

      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
      throw err;
    } finally {
      client.release();
    }

    await AuditService.log({
      actor_id,
      action: 'DISPUTE_CREATED',
      entity_type: 'booking',
      entity_id: booking_id,
      metadata: { reason: String(reason).trim().slice(0, 300) },
    });

    const landlordUserId = await PropertyModel.getLandlordUserIdByPropertyId(booking.property_id);
    await NotificationService.create({
      user_id: landlordUserId,
      type: 'dispute_raised',
      message: `A dispute was raised on ${booking.property_title}. Funds are frozen pending admin review.`,
      link: `/bookings/${booking_id}`,
    });
    await NotificationService.create({
      user_id: booking.student_id,
      type: 'dispute_submitted',
      message: `Your dispute for ${booking.property_title} has been submitted and is under review.`,
      link: `/bookings/${booking_id}`,
    });
    await NotificationService.notifyAdmins({
      type: 'dispute_raised',
      message: `New dispute on ${booking.property_title}: ${String(reason).trim()}`,
      link: '/dashboard/admin',
    });

    return attachLedger(booking_id);
  },

  async resolveDispute(booking_id, admin_id, resolution) {
    const booking = await BookingModel.findById(booking_id);

    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (!['refunded', 'released'].includes(resolution)) {
      throw { status: 400, message: 'Resolution must be either refunded or released' };
    }

    const finalStatus = resolution === 'refunded' ? 'refunded' : 'completed';
    const transactionType = resolution === 'refunded' ? 'refund' : 'release';
    let reference;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const locked = await client.query(
        `SELECT id, status, amount, property_id FROM bookings WHERE id = $1 FOR UPDATE`,
        [booking_id]
      );
      if (locked.rows.length === 0) {
        await client.query('ROLLBACK');
        throw { status: 404, message: 'Booking not found' };
      }
      if (locked.rows[0].status !== 'disputed') {
        await client.query('ROLLBACK');
        throw { status: 400, message: 'This booking is not in a disputed state' };
      }

      const existing = await client.query(
        `SELECT type FROM escrow_transactions
         WHERE booking_id = $1 AND type IN ('release', 'refund') AND status = 'completed'`,
        [booking_id]
      );
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        throw { status: 409, message: 'This escrow has already been settled' };
      }

      if (resolution === 'refunded') {
        await client.query(
          `UPDATE properties SET
            available_rooms = GREATEST(0, LEAST(total_rooms, available_rooms + 1)),
            status = CASE
              WHEN GREATEST(0, LEAST(total_rooms, available_rooms + 1)) = 0 THEN 'fully_booked'
              ELSE 'available'
            END,
            updated_at = NOW()
           WHERE id = $1`,
          [booking.property_id]
        );
      }

      await client.query(
        `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2`,
        [finalStatus, booking_id]
      );

      reference = generateReference();
      await client.query(
        `INSERT INTO escrow_transactions
          (booking_id, type, amount, status, reference)
         VALUES ($1, $2, $3, 'completed', $4)`,
        [booking_id, transactionType, booking.amount, reference]
      );

      await client.query(
        `UPDATE disputes SET
          resolution = $1,
          resolved_by = $2,
          resolved_at = NOW()
         WHERE booking_id = $3 AND resolution = 'pending'`,
        [resolution, admin_id, booking_id]
      );

      await client.query(
        `INSERT INTO booking_audit_log
          (booking_id, actor_id, from_status, to_status, reason)
         VALUES ($1, $2, 'disputed', $3, $4)`,
        [booking_id, admin_id, finalStatus, `Admin resolved dispute as: ${resolution}. Reference: ${reference}`]
      );

      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
      if (err.code === '23505') {
        throw { status: 409, message: 'This escrow has already been settled' };
      }
      throw err;
    } finally {
      client.release();
    }

    await AuditService.log({
      actor_id: admin_id,
      action: 'DISPUTE_RESOLVED',
      entity_type: 'booking',
      entity_id: booking_id,
      metadata: { resolution, reference },
    });
    await AuditService.log({
      actor_id: admin_id,
      action: resolution === 'refunded' ? 'REFUND_CREATED' : 'ESCROW_RELEASED',
      entity_type: 'booking',
      entity_id: booking_id,
      metadata: { amount: booking.amount, reference },
    });

    const landlordUserId = await PropertyModel.getLandlordUserIdByPropertyId(booking.property_id);
    const resolutionMessage = resolution === 'refunded'
      ? `Dispute on ${booking.property_title} was resolved in the student's favour. Funds were refunded.`
      : `Dispute on ${booking.property_title} was resolved. Funds were released to the landlord.`;

    await NotificationService.create({
      user_id: booking.student_id,
      type: 'dispute_resolved',
      message: resolutionMessage,
      link: `/bookings/${booking_id}`,
    });
    await NotificationService.create({
      user_id: landlordUserId,
      type: 'dispute_resolved',
      message: resolutionMessage,
      link: `/bookings/${booking_id}`,
    });

    return attachLedger(booking_id);
  },

  async sendDeadlineReminders() {
    const result = await pool.query(
      `SELECT id, student_id, property_id, auto_release_at
       FROM bookings
       WHERE status = 'move_in_window'
         AND auto_release_at IS NOT NULL
         AND auto_release_at > NOW()
         AND auto_release_at <= NOW() + INTERVAL '24 hours'
         AND reminder_sent_at IS NULL`
    );

    for (const booking of result.rows) {
      const hoursLeft = Math.max(
        1,
        Math.ceil((new Date(booking.auto_release_at) - new Date()) / (1000 * 60 * 60))
      );

      await NotificationService.create({
        user_id: booking.student_id,
        type: 'deadline_reminder',
        message: `Reminder: about ${hoursLeft} hour(s) left to confirm move-in or raise a dispute before funds auto-release.`,
        link: `/bookings/${booking.id}`,
      });

      await pool.query(
        `UPDATE bookings SET reminder_sent_at = NOW() WHERE id = $1 AND reminder_sent_at IS NULL`,
        [booking.id]
      );
    }
  },

  async autoReleaseExpired() {
    const expiredBookings = await BookingModel.findExpiredEscrows();

    if (expiredBookings.length === 0) return;

    for (const booking of expiredBookings) {
      const client = await pool.connect();
      let reference;
      try {
        await client.query('BEGIN');

        const locked = await client.query(
          `SELECT id, status, amount, student_id, property_id
           FROM bookings
           WHERE id = $1
           FOR UPDATE SKIP LOCKED`,
          [booking.id]
        );

        if (locked.rows.length === 0 || locked.rows[0].status !== 'move_in_window') {
          await client.query('ROLLBACK');
          continue;
        }

        const existingRelease = await client.query(
          `SELECT id FROM escrow_transactions
           WHERE booking_id = $1 AND type IN ('release', 'refund') AND status = 'completed'`,
          [booking.id]
        );
        if (existingRelease.rows.length > 0) {
          await client.query('ROLLBACK');
          continue;
        }

        const pendingCapture = await client.query(
          `SELECT id FROM escrow_transactions
           WHERE booking_id = $1 AND type = 'capture' AND status = 'pending'`,
          [booking.id]
        );
        if (pendingCapture.rows.length > 0) {
          await client.query('ROLLBACK');
          continue;
        }

        const openDispute = await client.query(
          `SELECT id FROM disputes
           WHERE booking_id = $1 AND resolution = 'pending'`,
          [booking.id]
        );
        if (openDispute.rows.length > 0) {
          await client.query('ROLLBACK');
          continue;
        }

        await client.query(
          `UPDATE bookings SET status = 'completed', updated_at = NOW()
           WHERE id = $1 AND status = 'move_in_window'`,
          [booking.id]
        );

        reference = generateReference();
        await client.query(
          `INSERT INTO escrow_transactions
            (booking_id, type, amount, status, reference)
           VALUES ($1, 'release', $2, 'completed', $3)`,
          [booking.id, booking.amount, reference]
        );

        await client.query(
          `INSERT INTO booking_audit_log
            (booking_id, actor_id, from_status, to_status, reason)
           VALUES ($1, $2, 'move_in_window', 'completed', $3)`,
          [booking.id, booking.student_id, `Auto-released after 72hr timeout. Reference: ${reference}`]
        );

        await client.query('COMMIT');
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
        console.error(`  Failed to auto-release booking ${booking.id}:`, err.message);
        client.release();
        continue;
      }
      client.release();

      await AuditService.log({
        actor_id: booking.student_id,
        action: 'ESCROW_RELEASED',
        entity_type: 'booking',
        entity_id: booking.id,
        metadata: { amount: booking.amount, reference, auto: true },
      });

      const landlordUserId = await PropertyModel.getLandlordUserIdByPropertyId(booking.property_id);
      await NotificationService.create({
        user_id: booking.student_id,
        type: 'funds_released',
        message: 'The 72-hour window closed. Escrow funds were automatically released to the landlord.',
        link: `/bookings/${booking.id}`,
      });
      await NotificationService.create({
        user_id: landlordUserId,
        type: 'funds_released',
        message: 'Escrow funds were auto-released after the move-in window expired.',
        link: `/bookings/${booking.id}`,
      });
    }
  },

};

module.exports = EscrowService;
