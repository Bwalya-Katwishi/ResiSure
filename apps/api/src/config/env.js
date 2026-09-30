function isProd() {
  return process.env.NODE_ENV === 'production';
}

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function livePaymentsConfigured() {
  const mtn = Boolean(
    process.env.MTN_COLLECTION_SUBSCRIPTION_KEY
    && process.env.MTN_API_USER
    && process.env.MTN_API_KEY
  );
  const airtel = Boolean(process.env.AIRTEL_CLIENT_ID && process.env.AIRTEL_CLIENT_SECRET);
  const zamtel = Boolean(
    process.env.ZAMTEL_COLLECTION_URL
    && process.env.ZAMTEL_THIRD_PARTY_ID
    && process.env.ZAMTEL_PASSWORD
    && process.env.ZAMTEL_SHORTCODE
  );
  return { mtn, airtel, zamtel, any: mtn || airtel || zamtel };
}

function corsOrigins() {
  const fromEnv = parseList(process.env.CLIENT_URL);
  if (isProd()) {
    return fromEnv;
  }
  return [
    ...fromEnv,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://localhost:8081',
    'http://localhost:19006',
  ].filter((origin, index, all) => all.indexOf(origin) === index);
}

function validateEnv() {
  if (!isProd()) return;

  const errors = [];
  const secret = process.env.JWT_SECRET || '';
  const placeholders = new Set([
    'replace_with_a_long_random_string',
    'replace_with_a_long_random_string_min_32_chars',
    'change_me_to_a_random_string_at_least_32_chars',
    'resisure_super_secret_change_this_in_production',
    'dev-only-insecure-resisure-secret',
  ]);
  const insecure = !secret || secret.length < 32 || placeholders.has(secret);

  if (insecure) {
    errors.push('JWT_SECRET must be a random string of at least 32 characters');
  }
  if (process.env.CORS_ALLOW_ALL === 'true') {
    errors.push('CORS_ALLOW_ALL cannot be true in production');
  }
  if (!corsOrigins().length) {
    errors.push('CLIENT_URL is required (comma-separated origins, including the web app URL)');
  }
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    errors.push('DATABASE_URL or DB_HOST is required');
  }
  if (!process.env.DATABASE_URL && !process.env.DB_PASSWORD) {
    errors.push('DB_PASSWORD is required when DATABASE_URL is not set');
  }

  const provider = (process.env.PAYMENT_PROVIDER || 'auto').toLowerCase();
  const live = livePaymentsConfigured();
  const allowMock = process.env.ALLOW_MOCK_PAYMENTS === 'true';
  if (!live.any && !allowMock) {
    errors.push('Set live MTN/Airtel/Zamtel credentials, or ALLOW_MOCK_PAYMENTS=true for a demo host');
  }
  if (live.any && !process.env.PAYMENTS_WEBHOOK_SECRET) {
    errors.push('PAYMENTS_WEBHOOK_SECRET is required when live payment providers are configured');
  }
  if (provider === 'mock' && !allowMock) {
    errors.push('PAYMENT_PROVIDER=mock requires ALLOW_MOCK_PAYMENTS=true in production');
  }

  if (errors.length) {
    throw new Error(`Invalid production configuration:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }
}

function productionWarnings() {
  if (!isProd()) return [];

  const warnings = [];
  const cloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET
  );
  const smtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
  const live = livePaymentsConfigured();
  const https = String(process.env.CLIENT_URL || '').startsWith('https://');

  if (!cloudinary) {
    warnings.push('Cloudinary is not configured — property uploads use local disk and may be lost if the server is replaced.');
  }
  if (!smtp) {
    warnings.push('SMTP is not configured — password reset and welcome emails will not be sent.');
  }
  if (!https) {
    warnings.push('CLIENT_URL is not HTTPS — configure a domain and run scripts/ec2-setup-https.sh on EC2.');
  }
  if (process.env.ALLOW_MOCK_PAYMENTS === 'true') {
    warnings.push('ALLOW_MOCK_PAYMENTS=true — mobile money is in demo mode, not live collection.');
  }
  if (live.any && !process.env.PAYMENTS_WEBHOOK_SECRET) {
    warnings.push('Live payment credentials are set but PAYMENTS_WEBHOOK_SECRET is missing.');
  }

  return warnings;
}

module.exports = {
  isProd,
  corsOrigins,
  validateEnv,
  productionWarnings,
  livePaymentsConfigured,
};
