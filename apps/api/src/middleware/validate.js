const { AppError } = require('../errors/AppError');
const { sendError } = require('../utils/httpError');

/**
 * Request validation middleware (Protected Variations / Indirection).
 * @param {(body: object) => string|null} validateFn - returns error message or null
 */
function validateBody(validateFn) {
  return (req, res, next) => {
    const message = validateFn(req.body || {});
    if (message) {
      return sendError(res, new AppError(400, message), message);
    }
    return next();
  };
}

module.exports = { validateBody };
