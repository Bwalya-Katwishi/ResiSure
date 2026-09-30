const MAX_VERIFICATION_DOC_BYTES = 8 * 1024 * 1024;

const ALLOWED_VERIFICATION_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

function detectKind(buffer) {
  if (!buffer || buffer.length < 4) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  if (
    buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
  ) {
    return 'png';
  }

  if (
    buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  if (buffer.toString('ascii', 0, 4) === '%PDF') {
    return 'pdf';
  }

  return null;
}

function validateVerificationBuffer(buffer, { label = 'Document' } = {}) {
  if (!buffer || !buffer.length) {
    throw { status: 400, message: `${label} is empty or unreadable` };
  }

  if (buffer.length > MAX_VERIFICATION_DOC_BYTES) {
    throw { status: 400, message: `${label} must be under 8MB` };
  }

  const kind = detectKind(buffer);
  if (!kind) {
    throw {
      status: 400,
      message: `${label} must be a JPG, PNG, WebP or PDF file`,
    };
  }

  return kind;
}

function assertAllowedVerificationMime(mimetype, { label = 'Document' } = {}) {
  if (!mimetype || !ALLOWED_VERIFICATION_MIMES.has(mimetype)) {
    throw {
      status: 400,
      message: `${label} must be JPG, PNG, WebP or PDF`,
    };
  }
}

module.exports = {
  MAX_VERIFICATION_DOC_BYTES,
  ALLOWED_VERIFICATION_MIMES,
  detectKind,
  validateVerificationBuffer,
  assertAllowedVerificationMime,
};
