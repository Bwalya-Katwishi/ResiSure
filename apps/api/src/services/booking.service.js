const BookingModel = require('../models/booking.model');
const PropertyModel = require('../models/property.model');
const EscrowService = require('./escrow.service');
const pool = require('../config/database');

const BookingService = {

  async createBooking(student_id, { property_id, move_in_date, move_out_date }) {
    if (!property_id || !move_in_date) {
      throw { status: 400, message: 'property_id and move_in_date are required' };
    }

    // Check property exists and has available rooms
    const property = await PropertyModel.findById(property_id);
    if (!property) throw { status: 404, message: 'Property not found' };
    if (property.available_rooms < 1) {
      throw { status: 400, message: 'No rooms available for this property' };
    }

    // Prevent duplicate active bookings
    const existing = await pool.query(
      `SELECT id FROM bookings 
       WHERE student_id = $1 
       AND property_id = $2 
       AND status NOT IN ('rejected', 'cancelled', 'refunded', 'completed')`,
      [student_id, property_id]
    );
    if (existing.rows.length > 0) {
      throw { status: 409, message: 'You already have an active booking for this property' };
    }

    const booking = await BookingModel.create({
      student_id,
      property_id,
      move_in_date,
      move_out_date: move_out_date || null,
      amount: property.rent_per_month,
    });

    // Audit log
    await BookingModel.logAudit({
      booking_id: booking.id,
      actor_id: student_id,
      from_status: null,
      to_status: 'pending',
      reason: 'Booking created by student',
    });

    return booking;
  },

  async acceptBooking(booking_id, landlord_user_id) {
    const booking = await BookingModel.findById(booking_id);
    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (booking.status !== 'pending') {
      throw { status: 400, message: 'Only pending bookings can be accepted' };
    }

    // Verify this landlord owns the property
    const landlordProfile = await PropertyModel.getLandlordProfile(landlord_user_id);
    const property = await PropertyModel.findById(booking.property_id);
    if (!landlordProfile || property.landlord_id !== landlordProfile.id) {
      throw { status: 403, message: 'You can only manage bookings for your own properties' };
    }

    await pool.query(
      `UPDATE bookings SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
      [booking_id]
    );

    await BookingModel.logAudit({
      booking_id,
      actor_id: landlord_user_id,
      from_status: 'pending',
      to_status: 'accepted',
      reason: 'Booking accepted by landlord — awaiting student payment',
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

  async payForBooking(booking_id, student_id) {
    return await EscrowService.capturePayment(booking_id, student_id);
  },

  async confirmMoveIn(booking_id, student_id) {
    return await EscrowService.confirmMoveIn(booking_id, student_id);
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

  async getLandlordBookings(landlord_user_id) {
    const landlordProfile = await PropertyModel.getLandlordProfile(landlord_user_id);
    if (!landlordProfile) throw { status: 404, message: 'Landlord profile not found' };
    return await BookingModel.findByLandlordId(landlordProfile.id);
  },

  async getBookingById(booking_id, user) {
    const booking = await BookingModel.findById(booking_id);
    if (!booking) throw { status: 404, message: 'Booking not found' };

    if (user.role === 'admin') return booking;

    if (user.role === 'student') {
      if (String(booking.student_id) !== String(user.id)) {
        throw { status: 403, message: 'Access denied' };
      }
      return booking;
    }

    if (user.role === 'landlord') {
      const landlordProfile = await PropertyModel.getLandlordProfile(user.id);
      const property = await PropertyModel.findById(booking.property_id);
      if (!landlordProfile || property.landlord_id !== landlordProfile.id) {
        throw { status: 403, message: 'Access denied' };
      }
      return booking;
    }

    throw { status: 403, message: 'Access denied' };
  },

};

module.exports = BookingService;