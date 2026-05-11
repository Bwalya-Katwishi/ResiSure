const BookingService = require('../services/booking.service');

const BookingController = {

  async create(req, res) {
    try {
      const booking = await BookingService.createBooking(req.user.id, req.body);
      return res.status(201).json({
        success: true,
        message: 'Booking request submitted successfully',
        data: { booking }
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false, message: err.message || 'Failed to create booking'
      });
    }
  },

  async accept(req, res) {
    try {
      const booking = await BookingService.acceptBooking(req.params.id, req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Booking accepted — student can now pay',
        data: { booking }
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false, message: err.message || 'Failed to accept booking'
      });
    }
  },

  async reject(req, res) {
    try {
      const booking = await BookingService.rejectBooking(req.params.id, req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Booking rejected',
        data: { booking }
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false, message: err.message || 'Failed to reject booking'
      });
    }
  },

  async pay(req, res) {
    try {
      const booking = await BookingService.payForBooking(req.params.id, req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Payment captured into escrow successfully',
        data: { booking }
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false, message: err.message || 'Failed to process payment'
      });
    }
  },

  async confirmMoveIn(req, res) {
    try {
      const booking = await BookingService.confirmMoveIn(req.params.id, req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Move-in confirmed — funds released to landlord',
        data: { booking }
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false, message: err.message || 'Failed to confirm move-in'
      });
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
        message: 'Dispute raised — funds frozen pending admin review',
        data: { booking }
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false, message: err.message || 'Failed to raise dispute'
      });
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
      return res.status(err.status || 500).json({
        success: false, message: err.message || 'Failed to resolve dispute'
      });
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
      return res.status(err.status || 500).json({
        success: false, message: err.message || 'Failed to fetch bookings'
      });
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
      return res.status(err.status || 500).json({
        success: false, message: err.message || 'Failed to fetch bookings'
      });
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
      return res.status(err.status || 500).json({
        success: false, message: err.message || 'Failed to fetch booking'
      });
    }
  },

};

module.exports = BookingController;