const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const PLACEHOLDER_SECRETS = new Set([
  'replace_with_a_long_random_string',
  'replace_with_a_long_random_string_min_32_chars',
  'change_me_to_a_random_string_at_least_32_chars',
  'resisure_super_secret_change_this_in_production',
  'dev-only-insecure-resisure-secret',
]);

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;
  const insecure =
    !secret ||
    secret.length < 32 ||
    PLACEHOLDER_SECRETS.has(secret);

  if (process.env.NODE_ENV === 'production' && insecure) {
    throw new Error('JWT_SECRET must be set to a long random value in production');
  }

  if (insecure) {
    console.warn('WARNING: JWT_SECRET is missing or insecure. Set a long random secret in apps/api/.env');
    return secret || 'dev-only-insecure-resisure-secret';
  }

  return secret;
}

const JWT_SECRET = resolveJwtSecret();

module.exports = { JWT_SECRET, JWT_EXPIRES_IN };
