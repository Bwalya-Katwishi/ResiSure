const roles = require('./constants/roles');
const { BRAND } = require('./constants/brand');
const booking = require('./constants/booking');
const verification = require('./constants/verification');
const authValidation = require('./validation/auth');
const nrcValidation = require('./validation/nrc');
const { API } = require('./api/endpoints');

module.exports = {
  BRAND,
  ...roles,
  ...booking,
  ...verification,
  ...authValidation,
  ...nrcValidation,
  API,
};
