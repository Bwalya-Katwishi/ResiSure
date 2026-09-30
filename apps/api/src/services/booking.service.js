const BookingModel = require('../models/booking.model');
const PropertyModel = require('../models/property.model');
const EscrowService = require('./escrow.service');
const NotificationService = require('./notification.service');
const AuditService = require('./audit.service');
const VerificationGate = require('../utils/verification');
const { attachBookingLocation } = require('../utils/location');
const { ACTIVE_BOOKING_STATUSES } = require('@resisure/shared/constants/booking');
const pool = require('../config/database');

const BOOKING_MESSAGES = {
  alreadyExists: 'You already have an active booking for this property',
  propertyFull:
    'This accommodation is no longer available. Another booking request may already be in progress.',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(id, label = 'id') {
  if (!id || !UUID_RE.test(String(id))) {
    throw { status: 400, message: `Invalid ${label}` };
  }
}

const BookingService = {

  async createBooking(student_id, { property_id, move_in_date, move_out_date }) {
    assertUuid(property_id, 'property_id');
    if (!property_id || !move_in_date) {
      throw { status: 400, message: 'property_id and move_in_date are required' };
    }

    await VerificationGate.requireVerifiedStudent(student_id);
    VerificationGate.assertMoveInDate(move_in_date);

    const property = await PropertyModel.findById(property_id);
    if (!property) throw { status: 404, message: 'Property not found' };
    VerificationGate.assertBookableProperty(property);
    if (property.status === 'unlisted') {
      throw { status: 400, message: 'This listing is not available' };
    }

    const moveIn = new Date(move_in_date);
    if (Number.isNaN(moveIn.getTime())) {
      throw { status: 400, message: 'move_in_date must be a valid date' };
    }

    const client = await pool.connect();
    let booking;
    try {
      await client.query('BEGIN');

      const lockedProperty = await client.query(
        `SELECT id, title, rent_per_month, total_rooms, available_rooms, status
         FROM properties
         WHERE id = $1
         FOR UPDATE`,
        [property_id]
      );
      const row = lockedProperty.rows[0];
      if (!row) {
        throw { status: 404, message: 'Property not found' };
      }
      if (row.status === 'unlisted') {
        throw { status: 400, message: 'This listing is not available' };
      }

      const studentActive = await client.query(
        `SELECT id FROM bookings
         WHERE student_id = $1
           AND property_id = $2
           AND status = ANY($3::text[])
         LIMIT 1`,
        [student_id, property_id, ACTIVE_BOOKING_STATUSES]
      );
      if (studentActive.rows.length > 0) {
        throw {
          status: 409,
          message: BOOKING_MESSAGES.alreadyExists,
          code: 'BOOKING_ALREADY_EXISTS',
        };
      }

      const activeCount = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM bookings
         WHERE property_id = $1
           AND status = ANY($2::text[])`,
        [property_id, ACTIVE_BOOKING_STATUSES]
      );
      if (activeCount.rows[0].count >= row.total_rooms) {
        throw {
          status: 409,
          message: BOOKING_MESSAGES.propertyFull,
          code: 'PROPERTY_FULLY_BOOKED',
        };
      }

      const inserted = await client.query(
        `INSERT INTO bookings
          (student_id, property_id, move_in_date, move_out_date, amount, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING *`,
        [
          student_id,
          property_id,
          move_in_date,
          move_out_date || null,
          row.rent_per_month,
        ]
      );
      booking = inserted.rows[0];

      await client.query(
        `INSERT INTO booking_audit_log
          (booking_id, actor_id, from_status, to_status, reason)
         VALUES ($1, $2, NULL, 'pending', $3)`,
        [booking.id, student_id, 'Booking created by student']
      );

      await client.query('COMMIT');
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        /* ignore */
      }
      if (err.code === '23505') {
        const blocked = {
          status: 409,
          message: BOOKING_MESSAGES.alreadyExists,
          code: 'BOOKING_ALREADY_EXISTS',
        };
        await AuditService.log({
          actor_id: student_id,
          action: 'BOOKING_CREATE_BLOCKED',
          entity_type: 'property',
          entity_id: property_id,
          metadata: { reason: blocked.code, concurrent: true },
        });
        throw blocked;
      }
      if (err.code === 'PROPERTY_FULLY_BOOKED' || err.code === 'BOOKING_ALREADY_EXISTS') {
        await AuditService.log({
          actor_id: student_id,
          action: 'BOOKING_CREATE_BLOCKED',
          entity_type: 'property',
          entity_id: property_id,
          metadata: { reason: err.code },
        });
      }
      throw err;
    } finally {
      client.release();
    }

    const landlordUserId = await PropertyModel.getLandlordUserIdByPropertyId(property_id);
    await AuditService.log({
      actor_id: student_id,
      action: 'BOOKING_CREATED',
      entity_type: 'booking',
      entity_id: booking.id,
      metadata: { property_id, amount: booking.amount },
    });

    await NotificationService.create({
      user_id: student_id,
      type: 'booking_submitted',
      message: `Your booking request for ${property.title} was submitted. We will notify you when the landlord responds.`,
      link: `/bookings/${booking.id}`,
    });

    await NotificationService.create({
      user_id: landlordUserId,
      type: 'booking_created',
      message: `New booking request for ${property.title}`,
      link: `/bookings/${booking.id}`,
    });

    return booking;
  },

  async cancelBooking(booking_id, student_id) {
    const booking = await BookingModel.findById(booking_id);
    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (String(booking.student_id) !== String(student_id)) {
      throw { status: 403, message: 'You can only cancel your own bookings' };
    }
    if (!['pending', 'accepted'].includes(booking.status)) {
      throw { status: 400, message: 'Only unpaid bookings can be cancelled' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cancelled = await client.query(
        `UPDATE bookings SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1 AND status IN ('pending', 'accepted')
         RETURNING property_id, status`,
        [booking_id]
      );

      if (!cancelled.rows[0]) {
        await client.query('ROLLBACK');
        throw { status: 400, message: 'Only unpaid bookings can be cancelled' };
      }

      if (booking.status === 'accepted') {
        await client.query(
          `UPDATE properties SET
            available_rooms = LEAST(available_rooms + 1, total_rooms),
            status = CASE
              WHEN available_rooms + 1 > 0 THEN 'available'
              ELSE status
            END,
            updated_at = NOW()
           WHERE id = $1`,
          [booking.property_id]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        /* ignore */
      }
      throw err;
    } finally {
      client.release();
    }

    await BookingModel.logAudit({
      booking_id,
      actor_id: student_id,
      from_status: booking.status,
      to_status: 'cancelled',
      reason: 'Cancelled by student before payment',
    });

    return BookingModel.findById(booking_id);
  },

  async acceptBooking(booking_id, landlord_user_id) {
    assertUuid(booking_id, 'booking id');
    await VerificationGate.requireVerifiedLandlord(landlord_user_id);

    const booking = await BookingModel.findById(booking_id);
    if (!booking) throw { status: 404, message: 'Booking not found' };

    // Verify this landlord owns the property before locking rows
    const landlordProfile = await PropertyModel.getLandlordProfile(landlord_user_id);
    const property = await PropertyModel.findById(booking.property_id);
    if (!landlordProfile || property.landlord_id !== landlordProfile.id) {
      throw { status: 403, message: 'You can only manage bookings for your own properties' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const propertyLock = await client.query(
        `SELECT id, available_rooms, total_rooms
         FROM properties
         WHERE id = $1
         FOR UPDATE`,
        [booking.property_id]
      );
      if (!propertyLock.rows[0] || propertyLock.rows[0].available_rooms < 1) {
        await client.query('ROLLBACK');
        throw {
          status: 409,
          message: BOOKING_MESSAGES.propertyFull,
          code: 'PROPERTY_FULLY_BOOKED',
        };
      }

      const bookingUpdate = await client.query(
        `UPDATE bookings
         SET status = 'accepted', updated_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING *`,
        [booking_id]
      );

      if (bookingUpdate.rows.length === 0) {
        await client.query('ROLLBACK');
        throw { status: 400, message: 'Only pending bookings can be accepted' };
      }

      const roomUpdate = await client.query(
        `UPDATE properties SET
          available_rooms = available_rooms - 1,
          status = CASE
            WHEN available_rooms - 1 <= 0 THEN 'fully_booked'
            ELSE 'available'
          END,
          updated_at = NOW()
         WHERE id = $1 AND available_rooms > 0
         RETURNING *`,
        [booking.property_id]
      );

      if (roomUpdate.rows.length === 0) {
        await client.query('ROLLBACK');
        throw {
          status: 409,
          message: BOOKING_MESSAGES.propertyFull,
          code: 'PROPERTY_FULLY_BOOKED',
        };
      }

      await client.query('COMMIT');
    } catch (err) {
      // Only roll back if the transaction is still open
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        /* ignore */
      }
      throw err;
    } finally {
      client.release();
    }

    await BookingModel.logAudit({
      booking_id,
      actor_id: landlord_user_id,
      from_status: 'pending',
      to_status: 'accepted',
      reason: 'Booking accepted by landlord — awaiting student payment',
    });

    await NotificationService.create({
      user_id: booking.student_id,
      type: 'booking_accepted',
      message: `Your booking for ${booking.property_title} was accepted. Pay into escrow on your move-in date.`,
      link: `/bookings/${booking_id}`,
    });

    return await BookingModel.findById(booking_id);
  },

  async rejectBooking(booking_id, landlord_user_id) {
    const booking = await BookingModel.findById(booking_id);
    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (booking.status !== 'pending') {
      throw { status: 400, message: 'Only pending bookings can be rejected' };
    }

    const landlordProfile = await PropertyModel.getLandlordProfile(landlord_user_id);
    const property = await PropertyModel.findById(booking.property_id);
    if (!landlordProfile || property.landlord_id !== landlordProfile.id) {
      throw { status: 403, message: 'You can only manage bookings for your own properties' };
    }

    await pool.query(
      `UPDATE bookings SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
      [booking_id]
    );

    await BookingModel.logAudit({
      booking_id,
      actor_id: landlord_user_id,
      from_status: 'pending',
      to_status: 'rejected',
      reason: 'Booking rejected by landlord',
    });

    await NotificationService.create({
      user_id: booking.student_id,
      type: 'booking_rejected',
      message: `Your booking for ${booking.property_title} was declined by the landlord.`,
      link: `/bookings/${booking_id}`,
    });

    return await BookingModel.findById(booking_id);
  },

  async openMoveInWindow(booking_id) {
    await pool.query(
      `UPDATE bookings SET 
        status = 'move_in_window', 
        updated_at = NOW() 
       WHERE id = $1`,
      [booking_id]
    );
  },

  async payForBooking(booking_id, student_id, paymentDetails = {}) {
    return EscrowService.capturePayment(booking_id, student_id, paymentDetails);
  },

  async completePendingPayment(booking_id, student_id, details = {}) {
    return EscrowService.completePendingPayment(booking_id, student_id, details);
  },

  async confirmMoveIn(booking_id, student_id, { move_in_code } = {}) {
    return await EscrowService.confirmMoveIn(booking_id, student_id, { move_in_code });
  },

  async raiseDispute(booking_id, student_id, reason) {
    return await EscrowService.raiseDispute(booking_id, student_id, reason);
  },

  async resolveDispute(booking_id, admin_id, resolution) {
    return await EscrowService.resolveDispute(booking_id, admin_id, resolution);
  },

  async getStudentBookings(student_id) {
    return await BookingModel.findByStudentId(student_id);
  },

  async getStudentTransactions(student_id) {
    return BookingModel.findTransactionsForStudent(student_id);
  },

  async getLandlordReleased(landlord_user_id) {
    const landlordProfile = await PropertyModel.getLandlordProfile(landlord_user_id);
    if (!landlordProfile) throw { status: 404, message: 'Landlord profile not found' };
    return BookingModel.findReleasedForLandlord(landlordProfile.id);
  },

  async getLandlordBookings(landlord_user_id) {
    const landlordProfile = await PropertyModel.getLandlordProfile(landlord_user_id);
    if (!landlordProfile) throw { status: 404, message: 'Landlord profile not found' };
    return await BookingModel.findByLandlordId(landlordProfile.id);
  },

  async getBookingById(booking_id, user) {
    assertUuid(booking_id, 'booking id');
    const booking = await BookingModel.findById(booking_id);
    if (!booking) throw { status: 404, message: 'Booking not found' };

    const attachTransactions = async (row, options = {}) => {
      row.transactions = await BookingModel.findTransactionsByBookingId(booking_id);
      if (!(user.role === 'student' && String(row.student_id) === String(user.id))) {
        delete row.move_in_code;
      }
      return attachBookingLocation(row, options);
    };

    if (user.role === 'admin') {
      return attachTransactions(booking, { includeForLandlord: true });
    }

    if (user.role === 'student') {
      if (String(booking.student_id) !== String(user.id)) {
        throw { status: 403, message: 'Access denied' };
      }
      return attachTransactions(booking);
    }

    if (user.role === 'landlord') {
      const landlordProfile = await PropertyModel.getLandlordProfile(user.id);
      const property = await PropertyModel.findById(booking.property_id);
      if (!landlordProfile || property.landlord_id !== landlordProfile.id) {
        throw { status: 403, message: 'Access denied' };
      }
      return attachTransactions(booking, { includeForLandlord: true });
    }

    throw { status: 403, message: 'Access denied' };
  },

};

module.exports = BookingService;