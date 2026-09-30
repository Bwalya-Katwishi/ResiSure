const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const { REGISTER_ROLES } = require('../constants/roles');
const MIN_PASSWORD_LENGTH = 8;

function validateRegister(body) {
  const { full_name, email, password, role } = body || {};
  if (!full_name || !email || !password || !role) {
    return 'full_name, email, password and role are required';
  }
  if (!EMAIL_PATTERN.test(String(email).trim())) {
    return 'Enter a valid email address';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (!REGISTER_ROLES.includes(role)) {
    return 'role must be student or landlord';
  }
  return null;
}

function validateLogin(body) {
  const { email, password } = body || {};
  if (!email || !password) {
    return 'Email and password are required';
  }
  return null;
}

function validateForgotPassword(body) {
  if (!body?.email) {
    return 'Email is required';
  }
  if (!EMAIL_PATTERN.test(String(body.email).trim())) {
    return 'Enter a valid email address';
  }
  return null;
}

function validateResetPassword(body) {
  const { token, password } = body || {};
  if (!token || !password) {
    return 'token and password are required';
  }
  if (String(password).length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

function getApiErrorMessage(err, fallback = 'We could not complete that request. Please try again.') {
  if (!err?.response) {
    return 'We could not reach ResiSure right now. Please check your connection and try again.';
  }
  const status = err.response.status;
  const message = err.response?.data?.message;
  if (status >= 500 || !message || message === 'Internal server error') {
    return fallback;
  }
  return message;
}

module.exports = {
  EMAIL_PATTERN,
  MIN_PASSWORD_LENGTH,
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  getApiErrorMessage,
};
