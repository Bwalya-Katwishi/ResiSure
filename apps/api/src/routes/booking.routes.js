const express = require('express');
const router = express.Router();
const BookingController = require('../controllers/booking.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// All booking routes require authentication
router.use(protect);

// Student routes
router.post('/', restrictTo('student'), BookingController.create);
router.get('/my', restrictTo('student'), BookingController.myBookings);
router.put('/:id/pay', restrictTo('student'), BookingController.pay);
router.put('/:id/confirm', restrictTo('student'), BookingController.confirmMoveIn);
router.put('/:id/dispute', restrictTo('student'), BookingController.dispute);

// Landlord routes
router.get('/landlord', restrictTo('landlord'), BookingController.landlordBookings);
router.put('/:id/accept', restrictTo('landlord'), BookingController.accept);
router.put('/:id/reject', restrictTo('landlord'), BookingController.reject);

// Admin routes
router.put('/:id/resolve', restrictTo('admin'), BookingController.resolve);

// Shared — student, landlord and admin can view a booking
router.get('/:id', BookingController.getOne);

module.exports = router;