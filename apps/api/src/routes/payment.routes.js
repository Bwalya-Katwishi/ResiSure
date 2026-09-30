const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/payment.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.get('/methods', PaymentController.methods);

router.get(
  '/bookings/:bookingId/status',
  protect,
  restrictTo('student'),
  PaymentController.bookingStatus
);

router.post(
  '/bookings/:bookingId/reconcile',
  protect,
  restrictTo('student'),
  PaymentController.reconcile
);

router.post('/webhooks/:provider', PaymentController.webhook);

module.exports = router;
