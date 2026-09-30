const { isAppError } = require('../errors/AppError');

function publicErrorMessage(err, fallback = 'Request failed') {
  if (!err) return fallback;
  const status = err.status || 500;
  if (status < 500 && err.message) return err.message;
  if (status >= 500) return 'Internal server error';
  return fallback;
}

function sendError(res, err, fallback) {
  const status = err?.status || 500;
  if (status >= 500) {
    console.error(isAppError(err) && err.cause ? err.cause : err);
  }
  return res.status(status).json({
    success: false,
    message: publicErrorMessage(err, fallback),
    ...(err?.code ? { code: err.code } : {}),
  });
}
module.exports = { publicErrorMessage, sendError };
