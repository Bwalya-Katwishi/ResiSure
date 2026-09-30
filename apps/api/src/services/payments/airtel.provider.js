const crypto = require('crypto');
const { validateZmPhone, toNationalMsisdn } = require('./phone');
const { normalizeProviderStatus, buildChargeResult } = require('./providerUtils');

const PROVIDER_ID = 'airtel_money';
const PROVIDER_LABEL = 'Airtel Money';

let cachedToken = null;
let tokenExpiresAt = 0;

function configured() {
  return Boolean(process.env.AIRTEL_CLIENT_ID && process.env.AIRTEL_CLIENT_SECRET);
}

function baseUrl() {
  return process.env.AIRTEL_BASE_URL
    || (process.env.AIRTEL_ENVIRONMENT === 'production'
      ? 'https://openapi.airtel.africa'
      : 'https://openapiuat.airtel.africa');
}

function requireConfigured() {
  if (!configured()) {
    throw {
      status: 503,
      message: 'Airtel Money is not configured. Set AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET.',
    };
  }
}

async function getToken() {
  requireConfigured();
  if (cachedToken && Date.now() < tokenExpiresAt - 30_000) return cachedToken;

  const res = await fetch(`${baseUrl()}/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.AIRTEL_CLIENT_ID,
      client_secret: process.env.AIRTEL_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  const body = await res.json().catch(() => ({}));
  const token = body.access_token || body.token;
  if (!res.ok || !token) {
    throw {
      status: 502,
      message: body.error_description || body.message || 'Airtel Money authentication failed',
    };
  }
  cachedToken = token;
  tokenExpiresAt = Date.now() + (Number(body.expires_in) || 1800) * 1000;
  return cachedToken;
}

const AirtelMoneyProvider = {
  id: PROVIDER_ID,
  label: PROVIDER_LABEL,
  configured,

  async charge({ amount, phone, idempotencyKey, bookingId }) {
    requireConfigured();
    const normalizedPhone = validateZmPhone(phone);
    const reference = idempotencyKey || crypto.randomUUID();
    const token = await getToken();

    const res = await fetch(`${baseUrl()}/merchant/v1/payments/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Country': process.env.AIRTEL_COUNTRY || 'ZM',
        'X-Currency': process.env.AIRTEL_CURRENCY || 'ZMW',
      },
      body: JSON.stringify({
        reference: bookingId || reference,
        subscriber: {
          country: process.env.AIRTEL_COUNTRY || 'ZM',
          currency: process.env.AIRTEL_CURRENCY || 'ZMW',
          msisdn: toNationalMsisdn(normalizedPhone),
        },
        transaction: {
          amount: Number(amount),
          country: process.env.AIRTEL_COUNTRY || 'ZM',
          currency: process.env.AIRTEL_CURRENCY || 'ZMW',
          id: reference,
        },
      }),
    });

    const body = await res.json().catch(() => ({}));
    const accepted = res.ok && (body.status?.success !== false);
    if (!accepted) {
      throw {
        status: 502,
        message: body.status?.message || body.message || `Airtel Money rejected the collection request (${res.status})`,
      };
    }

    return buildChargeResult({
      status: 'pending',
      provider: PROVIDER_ID,
      providerLabel: PROVIDER_LABEL,
      phone: normalizedPhone,
      amount,
      currency: process.env.AIRTEL_CURRENCY || 'ZMW',
      reference,
      sandbox: process.env.AIRTEL_ENVIRONMENT !== 'production',
      live: process.env.AIRTEL_ENVIRONMENT === 'production',
      message: 'Approve the Airtel Money prompt on your phone. Escrow will update when Airtel confirms.',
    });
  },

  async getStatus(reference) {
    requireConfigured();
    const token = await getToken();
    const res = await fetch(`${baseUrl()}/standard/v1/payments/${reference}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Country': process.env.AIRTEL_COUNTRY || 'ZM',
        'X-Currency': process.env.AIRTEL_CURRENCY || 'ZMW',
      },
    });
    const body = await res.json().catch(() => ({}));
    const rawStatus = body.data?.transaction?.status || body.status?.code || body.status;
    return {
      status: normalizeProviderStatus(rawStatus, PROVIDER_ID),
      provider: PROVIDER_ID,
      reference,
      raw: body,
    };
  },
};

module.exports = AirtelMoneyProvider;
