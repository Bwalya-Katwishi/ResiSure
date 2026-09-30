/** Shared provider status normalisation — never trust raw callback bodies alone. */

const SUCCESS = new Set(['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'TS', 'TIP', '00', '0']);
const FAILED = new Set(['FAILED', 'FAILURE', 'REJECTED', 'TIMEOUT', 'CANCELLED', 'CANCELED', 'EXPIRED', 'TF', '01']);
const PENDING = new Set(['PENDING', 'INITIATED', 'PROCESSING', 'IN_PROGRESS', 'TA', '02']);

function normalizeProviderStatus(raw, providerId = '') {
  const value = String(raw ?? '').trim().toUpperCase();
  if (!value) return 'pending';
  if (SUCCESS.has(value)) return 'success';
  if (FAILED.has(value)) return 'failed';
  if (PENDING.has(value)) return 'pending';
  if (providerId === 'mtn_momo') {
    if (value.includes('SUCCESS')) return 'success';
    if (value.includes('FAIL') || value.includes('REJECT') || value.includes('TIMEOUT')) return 'failed';
  }
  if (providerId === 'airtel_money') {
    if (value.includes('SUCCESS')) return 'success';
    if (value.includes('FAIL') || value.includes('EXPIR')) return 'failed';
  }
  return 'pending';
}

function buildChargeResult({
  status,
  provider,
  providerLabel,
  phone,
  amount,
  currency = 'ZMW',
  reference,
  sandbox = false,
  live = false,
  message,
}) {
  return {
    success: status === 'success',
    status,
    provider,
    provider_label: providerLabel,
    phone,
    amount: Number(amount),
    currency,
    reference,
    sandbox,
    live,
    message,
  };
}

/** Strip secrets before persisting provider payloads. */
function sanitizeProviderPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const copy = JSON.parse(JSON.stringify(payload));
  const secretKeys = [
    'password', 'secret', 'token', 'access_token', 'api_key', 'client_secret',
    'authorization', 'Authorization',
  ];
  function redact(obj) {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach((key) => {
      if (secretKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        obj[key] = '[redacted]';
      } else if (typeof obj[key] === 'object') {
        redact(obj[key]);
      }
    });
  }
  redact(copy);
  return copy;
}

function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
}

module.exports = {
  normalizeProviderStatus,
  buildChargeResult,
  sanitizeProviderPayload,
  maskPhone,
};
