/**
 * Payment application service.
 * Orchestrates the active PaymentProvider. Escrow must never import a PSP directly.
 */

const pool = require('../config/database');
const BookingModel = require('../models/booking.model');
const EscrowService = require('./escrow.service');
const { getPaymentProvider, providers, describeMethods } = require('./payments');
const { maskPhone, sanitizeProviderPayload } = require('./payments/providerUtils');

const PaymentService = {
  getProvider(phone, forcedProvider) {
    return getPaymentProvider(phone, forcedProvider);
  },

  async initiatePayment({ amount, phone, outcome, idempotencyKey, bookingId, provider }) {
    const instance = getPaymentProvider(phone, provider);
    return instance.charge({ amount, phone, outcome, idempotencyKey, bookingId });
  },

  describeMethods() {
    return describeMethods();
  },

  async queryPaymentStatus(reference, providerName) {
    const provider = providers[providerName];
    if (!provider || typeof provider.getStatus !== 'function') {
      return { status: 'pending', provider: providerName, reference };
    }
    const result = await provider.getStatus(reference);
    return {
      ...result,
      provider_payload: sanitizeProviderPayload(result.raw),
    };
  },

  async getBookingPaymentStatus(bookingId, userId) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (String(booking.student_id) !== String(userId)) {
      throw { status: 403, message: 'Access denied' };
    }

    const capture = await pool.query(
      `SELECT id, status, reference, payment_provider, payer_phone, amount, provider_status,
              created_at, updated_at, confirmed_at
       FROM escrow_transactions
       WHERE booking_id = $1 AND type = 'capture'
       ORDER BY created_at DESC
       LIMIT 1`,
      [bookingId]
    );
    const row = capture.rows[0];
    if (!row) {
      return {
        booking_id: bookingId,
        booking_status: booking.status,
        payment: null,
      };
    }

    let providerStatus = row.provider_status || row.status;
    if (row.status === 'pending' && row.reference && row.payment_provider && providers[row.payment_provider]) {
      try {
        const polled = await this.queryPaymentStatus(row.reference, row.payment_provider);
        providerStatus = polled.status;
        if (polled.status !== 'pending') {
          await EscrowService.finalizeByReference(row.reference, polled.status);
          const refreshed = await pool.query(
            `SELECT status, provider_status, confirmed_at, updated_at
             FROM escrow_transactions WHERE id = $1`,
            [row.id]
          );
          Object.assign(row, refreshed.rows[0] || {});
        } else {
          await pool.query(
            `UPDATE escrow_transactions SET provider_status = $1, updated_at = NOW() WHERE id = $2`,
            [polled.status, row.id]
          );
        }
      } catch (err) {
        console.error('Payment status poll failed:', err.message);
      }
    }

    const refreshedBooking = await BookingModel.findById(bookingId);
    return {
      booking_id: bookingId,
      booking_status: refreshedBooking.status,
      payment: {
        id: row.id,
        status: row.status,
        provider_status: providerStatus,
        provider: row.payment_provider,
        reference: row.reference,
        amount: Number(row.amount),
        currency: 'ZMW',
        payer_phone_masked: maskPhone(row.payer_phone),
        created_at: row.created_at,
        updated_at: row.updated_at,
        confirmed_at: row.confirmed_at,
      },
    };
  },

  async reconcileBookingPayment(bookingId, userId) {
    const status = await this.getBookingPaymentStatus(bookingId, userId);
    return status;
  },

  /** @deprecated use initiatePayment */
  async initiateSandboxPayment(args) {
    return this.initiatePayment(args);
  },
};

module.exports = PaymentService;
