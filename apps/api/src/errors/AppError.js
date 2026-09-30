/**
 * Typed application error for consistent HTTP error handling (Indirection pattern).
 * Supports legacy plain-object throws during migration: { status, message, code }.
 */
class AppError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    if (code) this.code = code;
  }
}

function isAppError(err) {
  return err instanceof AppError;
}

/** Normalize legacy `{ status, message }` throws and AppError instances. */
function normalizeError(err, fallbackMessage = 'Request failed', fallbackStatus = 500) {
  if (isAppError(err)) return err;
  if (err && typeof err.status === 'number' && err.message) {
    return new AppError(err.status, err.message, err.code);
  }
  if (err instanceof Error) {
    const normalized = new AppError(fallbackStatus, fallbackMessage);
    normalized.cause = err;
    return normalized;
  }
  return new AppError(fallbackStatus, fallbackMessage);
}

module.exports = { AppError, isAppError, normalizeError };
