const BookingService = require('../services/booking.service');
const { sendError } = require('../utils/httpError');

const BookingController = {

  async create(req, res) {
    try {
      const booking = await BookingService.createBooking(req.user.id, req.body);
      return res.status(201).json({
        success: true,
        message: 'Booking request submitted successfully. We will notify you when the landlord responds.',
        data: { booking }
      });
    } catch (err) {
      return sendError(res, err, 'Failed to create booking');
    }
  },

  async accept(req, res) {
    try {
      const booking = await BookingService.acceptBooking(req.params.id, req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Booking request accepted. The student has been notified.',
        data: { booking }
      });
    } catch (err) {
      return sendError(res, err, 'Failed to accept booking');
    }
  },

  async reject(req, res) {
    try {
      const booking = await BookingService.rejectBooking(req.params.id, req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Booking request declined. The student has been notified.',
        data: { booking }
      });
    } catch (err) {
      return sendError(res, err, 'Failed to reject booking');
    }
  },

  async pay(req, res) {
    try {
      const booking = await BookingService.payForBooking(req.params.id, req.user.id, {
        phone: req.body.phone,
        outcome: req.body.outcome,
        provider: req.body.provider,
      });
      return res.status(200).json({
        success: true,
        message: booking.payment?.message || 'Escrow-style protected payment captured successfully',
        data: { booking, payment: booking.payment || null }
      });
    } catch (err) {
      return sendError(res, err, 'Failed to process payment');
    }
  },

  async completePendingPayment(req, res) {
    try {
      const booking = await BookingService.completePendingPayment(req.params.id, req.user.id, {
        outcome: req.body.outcome || 'success',
      });
      return res.status(200).json({
        success: true,
        message: booking.payment?.message || 'Pending payment completed',
        data: { booking, payment: booking.payment || null },
      });
    } catch (err) {
      return sendError(res, err, 'Failed to complete payment');
    }
  },

  async cancel(req, res) {
    try {
      const booking = await BookingService.cancelBooking(req.params.id, req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Booking cancelled',
        data: { booking },
      });
    } catch (err) {
      return sendError(res, err, 'Failed to cancel booking');
    }
  },

  async confirmMoveIn(req, res) {
    try {
      const booking = await BookingService.confirmMoveIn(req.params.id, req.user.id, {
        move_in_code: req.body?.move_in_code,
      });
      return res.status(200).json({
        success: true,
        message: 'Move-in confirmed successfully.',
        data: { booking }
      });
    } catch (err) {
      return sendError(res, err, 'Failed to confirm move-in');
    }
  },

  async dispute(req, res) {
    try {
      const booking = await BookingService.raiseDispute(
        req.params.id,
        req.user.id,
        req.body.reason
      );
      return res.status(200).json({
        success: true,
        message: 'Your dispute has been submitted and is under review.',
        data: { booking }
      });
    } catch (err) {
      return sendError(res, err, 'Failed to raise dispute');
    }
  },

  async resolve(req, res) {
    try {
      const booking = await BookingService.resolveDispute(
        req.params.id,
        req.user.id,
        req.body.resolution
      );
      return res.status(200).json({
        success: true,
        message: `Dispute resolved — ${req.body.resolution}`,
        data: { booking }
      });
    } catch (err) {
      return sendError(res, err, 'Failed to resolve dispute');
    }
  },

  async myTransactions(req, res) {
    try {
      const transactions = await BookingService.getStudentTransactions(req.user.id);
      return res.status(200).json({
        success: true,
        count: transactions.length,
        data: { transactions },
      });
    } catch (err) {
      return sendError(res, err, 'Failed to fetch transactions');
    }
  },

  async landlordReleased(req, res) {
    try {
      const transactions = await BookingService.getLandlordReleased(req.user.id);
      return res.status(200).json({
        success: true,
        count: transactions.length,
        data: { transactions },
      });
    } catch (err) {
      return sendError(res, err, 'Failed to fetch released funds');
    }
  },

  async myBookings(req, res) {
    try {
      const bookings = await BookingService.getStudentBookings(req.user.id);
      return res.status(200).json({
        success: true,
        count: bookings.length,
        data: { bookings }
      });
    } catch (err) {
      return sendError(res, err, 'Failed to fetch bookings');
    }
  },

  async landlordBookings(req, res) {
    try {
      const bookings = await BookingService.getLandlordBookings(req.user.id);
      return res.status(200).json({
        success: true,
        count: bookings.length,
        data: { bookings }
      });
    } catch (err) {
      return sendError(res, err, 'Failed to fetch bookings');
    }
  },

  async getOne(req, res) {
    try {
      const booking = await BookingService.getBookingById(req.params.id, req.user);
      return res.status(200).json({
        success: true,
        data: { booking }
      });
    } catch (err) {
      return sendError(res, err, 'Failed to fetch booking');
    }
  },

};

module.exports = BookingController;