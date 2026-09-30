const crypto = require('crypto');
const { validateZmPhone, toMsisdn260 } = require('./phone');
const { normalizeProviderStatus, buildChargeResult } = require('./providerUtils');

const PROVIDER_ID = 'mtn_momo';
const PROVIDER_LABEL = 'MTN MoMo';

let cachedToken = null;
let tokenExpiresAt = 0;

function configured() {
  return Boolean(
    process.env.MTN_COLLECTION_SUBSCRIPTION_KEY
    && process.env.MTN_API_USER
    && process.env.MTN_API_KEY
  );
}

function baseUrl() {
  return process.env.MTN_BASE_URL
    || (process.env.MTN_TARGET_ENVIRONMENT === 'sandbox'
      ? 'https://sandbox.momodeveloper.mtn.com'
      : 'https://proxy.momoapi.mtn.com');
}

function targetEnvironment() {
  return process.env.MTN_TARGET_ENVIRONMENT || 'mtnzambia';
}

function currency() {
  if (process.env.MTN_CURRENCY) return process.env.MTN_CURRENCY;
  return targetEnvironment() === 'sandbox' ? 'EUR' : 'ZMW';
}

function requireConfigured() {
  if (!configured()) {
    throw {
      status: 503,
      message: 'MTN MoMo is not configured. Set MTN_COLLECTION_SUBSCRIPTION_KEY, MTN_API_USER, and MTN_API_KEY.',
    };
  }
}

async function getToken() {
  requireConfigured();
  if (cachedToken && Date.now() < tokenExpiresAt - 30_000) return cachedToken;

  const basic = Buffer.from(`${process.env.MTN_API_USER}:${process.env.MTN_API_KEY}`).toString('base64');
  const res = await fetch(`${baseUrl()}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Ocp-Apim-Subscription-Key': process.env.MTN_COLLECTION_SUBSCRIPTION_KEY,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw {
      status: 502,
      message: body.message || 'MTN MoMo authentication failed',
    };
  }
  cachedToken = body.access_token;
  tokenExpiresAt = Date.now() + (Number(body.expires_in) || 3600) * 1000;
  return cachedToken;
}

const MtnMomoProvider = {
  id: PROVIDER_ID,
  label: PROVIDER_LABEL,
  configured,

  async charge({ amount, phone, idempotencyKey, bookingId }) {
    requireConfigured();
    const normalizedPhone = validateZmPhone(phone);
    const reference = idempotencyKey || crypto.randomUUID();
    const token = await getToken();
    const callback = process.env.MTN_CALLBACK_URL
      || `${process.env.API_PUBLIC_URL || 'http://localhost:5000'}/api/payments/webhooks/mtn`;

    const res = await fetch(`${baseUrl()}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': reference,
        'X-Target-Environment': targetEnvironment(),
        'X-Callback-Url': callback,
        'Ocp-Apim-Subscription-Key': process.env.MTN_COLLECTION_SUBSCRIPTION_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: String(Number(amount).toFixed(2)),
        currency: currency(),
        externalId: bookingId || reference,
        payer: {
          partyIdType: 'MSISDN',
          partyId: toMsisdn260(normalizedPhone),
        },
        payerMessage: 'ResiSure escrow hold',
        payeeNote: 'Student housing escrow',
      }),
    });

    if (res.status !== 202 && res.status !== 200) {
      const errBody = await res.json().catch(() => ({}));
      throw {
        status: 502,
        message: errBody.message || `MTN MoMo rejected the collection request (${res.status})`,
      };
    }

    return buildChargeResult({
      status: 'pending',
      provider: PROVIDER_ID,
      providerLabel: PROVIDER_LABEL,
      phone: normalizedPhone,
      amount,
      currency: currency(),
      reference,
      sandbox: targetEnvironment() === 'sandbox',
      live: targetEnvironment() !== 'sandbox',
      message: 'Approve the MTN MoMo prompt on your phone. Escrow will update when MTN confirms.',
    });
  },

  async getStatus(reference) {
    requireConfigured();
    const token = await getToken();
    const res = await fetch(`${baseUrl()}/collection/v1_0/requesttopay/${reference}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Target-Environment': targetEnvironment(),
        'Ocp-Apim-Subscription-Key': process.env.MTN_COLLECTION_SUBSCRIPTION_KEY,
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: 'pending', provider: PROVIDER_ID, reference, raw: body };
    }
    return {
      status: normalizeProviderStatus(body.status, PROVIDER_ID),
      provider: PROVIDER_ID,
      reference,
      raw: body,
    };
  },
};

module.exports = MtnMomoProvider;
