/**
 * Development/demo payment provider.
 *
 * This is NOT MTN MoMo or Airtel Money.
 * It exists so the escrow workflow can be demonstrated without live credentials.
 *
 * Outcomes:
 *   success — funds captured (held in escrow by ResiSure, not paid to the landlord)
 *   failed  — debit declined
 *   pending — awaiting a later callback (simulates delayed PSP confirmation)
 *
 * Demo shortcuts (if `outcome` is omitted):
 *   phone ending 000 → failed
 *   phone ending 111 → pending
 *   otherwise        → success
 */

const PROVIDER_ID = 'mock';
const PROVIDER_LABEL = 'ResiSure mock payment';

function normalizePhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('260') && digits.length === 12) {
    digits = `0${digits.slice(3)}`;
  }
  return digits;
}

function validatePhone(phone) {
  const normalized = normalizePhone(phone);
  if (normalized && !/^0[579]\d{8}$/.test(normalized)) {
    throw {
      status: 400,
      message: 'Enter a valid Zambian mobile number (e.g. 0971234567)',
    };
  }
  return normalized || '0970000001';
}

function inferOutcome(outcome, phone) {
  const requested = String(outcome || '').toLowerCase();
  if (['success', 'failed', 'pending'].includes(requested)) return requested;
  if (phone.endsWith('000')) return 'failed';
  if (phone.endsWith('111')) return 'pending';
  return 'success';
}

function generateReference() {
  return `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MockPaymentProvider = {
  id: PROVIDER_ID,
  label: PROVIDER_LABEL,

  /**
   * Charge a demo payment. Never talks to a real mobile-money network.
   */
  async charge({ amount, phone, outcome, idempotencyKey }) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_PAYMENTS !== 'true') {
      throw {
        status: 503,
        message: 'Mock payments are disabled in production. Configure live mobile-money credentials.',
      };
    }
    const normalizedPhone = validatePhone(phone);
    const status = inferOutcome(outcome, normalizedPhone);
    await delay(400);

    return {
      success: status === 'success',
      status,
      provider: PROVIDER_ID,
      provider_label: PROVIDER_LABEL,
      phone: normalizedPhone,
      amount: Number(amount),
      currency: 'ZMW',
      reference: idempotencyKey || generateReference(),
      sandbox: true,
      live: false,
      message:
        status === 'success'
          ? `${PROVIDER_LABEL} approved ZMW ${Number(amount).toLocaleString()}`
          : status === 'pending'
            ? `${PROVIDER_LABEL} returned pending — complete the callback to finish capture`
            : `${PROVIDER_LABEL} declined the payment`,
    };
  },
};

module.exports = MockPaymentProvider;
