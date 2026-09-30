/**
 * Zamtel Kwacha collection adapter.
 *
 * Zamtel does not publish a stable, self-service merchant REST/OpenAPI document.
 * Merchant onboarding is commercial — contact Zamtel for current endpoints,
 * credentials, and callback format (legacy REST was deprecated in favour of XML).
 *
 * This adapter activates ONLY when your merchant-provided env vars are set.
 * It posts to ZAMTEL_COLLECTION_URL supplied by Zamtel — ResiSure does not
 * hardcode a production Zamtel host.
 *
 * Official contact: https://www.zamtel.zm/
 */

const crypto = require('crypto');
const { validateZmPhone, toMsisdn260 } = require('./phone');
const { normalizeProviderStatus, buildChargeResult } = require('./providerUtils');

const PROVIDER_ID = 'zamtel_kwacha';
const PROVIDER_LABEL = 'Zamtel Kwacha';

function configured() {
  return Boolean(
    process.env.ZAMTEL_COLLECTION_URL
    && process.env.ZAMTEL_THIRD_PARTY_ID
    && process.env.ZAMTEL_PASSWORD
    && process.env.ZAMTEL_SHORTCODE
  );
}

function requireConfigured() {
  if (!configured()) {
    throw {
      status: 503,
      message:
        'Zamtel Kwacha is not configured. Obtain merchant credentials from Zamtel and set ZAMTEL_COLLECTION_URL, ZAMTEL_THIRD_PARTY_ID, ZAMTEL_PASSWORD, and ZAMTEL_SHORTCODE.',
    };
  }
}

function mapStatus(body) {
  const raw = body?.status
    || body?.ResultCode
    || body?.resultCode
    || body?.ResponseCode
    || body?.responseCode;
  return normalizeProviderStatus(raw, PROVIDER_ID);
}

const ZamtelKwachaProvider = {
  id: PROVIDER_ID,
  label: PROVIDER_LABEL,
  configured,

  async charge({ amount, phone, idempotencyKey, bookingId }) {
    requireConfigured();
    const normalizedPhone = validateZmPhone(phone);
    const reference = idempotencyKey || crypto.randomUUID();
    const msisdn = toMsisdn260(normalizedPhone);

    const params = new URLSearchParams({
      ThirdPartyID: process.env.ZAMTEL_THIRD_PARTY_ID,
      Password: process.env.ZAMTEL_PASSWORD,
      Shortcode: process.env.ZAMTEL_SHORTCODE,
      Amount: String(Number(amount).toFixed(2)),
      ConversationId: reference,
      Msisdn: msisdn,
      ...(bookingId ? { AccountReference: String(bookingId) } : {}),
    });

    const res = await fetch(process.env.ZAMTEL_COLLECTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json, text/xml, */*',
      },
      body: params.toString(),
    });

    const text = await res.text();
    let body = {};
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }

    if (!res.ok) {
      throw {
        status: 502,
        message: body.message || body.ResponseDescription || `Zamtel rejected the collection request (${res.status})`,
      };
    }

    const immediate = mapStatus(body);
    if (immediate === 'failed') {
      throw {
        status: 402,
        message: body.ResponseDescription || body.message || 'Zamtel Kwacha payment was declined',
      };
    }

    return buildChargeResult({
      status: immediate === 'success' ? 'success' : 'pending',
      provider: PROVIDER_ID,
      providerLabel: PROVIDER_LABEL,
      phone: normalizedPhone,
      amount,
      reference,
      sandbox: process.env.ZAMTEL_ENVIRONMENT !== 'production',
      live: process.env.ZAMTEL_ENVIRONMENT === 'production',
      message: immediate === 'success'
        ? 'Zamtel Kwacha payment confirmed.'
        : 'Approve the Zamtel Kwacha prompt on your phone. Escrow will update when Zamtel confirms.',
    });
  },

  async getStatus(reference) {
    requireConfigured();
    const statusUrl = process.env.ZAMTEL_STATUS_URL;
    if (!statusUrl) {
      return { status: 'pending', provider: PROVIDER_ID, reference };
    }

    const url = statusUrl.includes('{reference}')
      ? statusUrl.replace('{reference}', encodeURIComponent(reference))
      : `${statusUrl}${statusUrl.includes('?') ? '&' : '?'}ConversationId=${encodeURIComponent(reference)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ThirdPartyID: process.env.ZAMTEL_THIRD_PARTY_ID,
        Password: process.env.ZAMTEL_PASSWORD,
      },
    });
    const text = await res.text();
    let body = {};
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }

    return {
      status: mapStatus(body),
      provider: PROVIDER_ID,
      reference,
      raw: body,
    };
  },

  verifyWebhook(_body, _headers) {
    return Boolean(process.env.ZAMTEL_WEBHOOK_SECRET);
  },
};

module.exports = ZamtelKwachaProvider;
