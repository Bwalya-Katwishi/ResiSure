export const MAX_VERIFICATION_DOC_BYTES = 8 * 1024 * 1024;

export const ALLOWED_VERIFICATION_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export function formatDocSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateVerificationFile(file, label) {
  if (!file) {
    return `${label} is required`;
  }
  if (!ALLOWED_VERIFICATION_TYPES.includes(file.type)) {
    return `${label} must be JPG, PNG, WebP or PDF`;
  }
  if (file.size > MAX_VERIFICATION_DOC_BYTES) {
    return `${label} must be under 8MB`;
  }
  return null;
}
