/** Zambian NRC format: 123456/78/1 */
const NRC_PATTERN = /^\d{6}\/\d{2}\/\d{1}$/;

const NRC_FORMAT_MESSAGE =
  'NRC number must be in the format 123456/78/1 (six digits, slash, two digits, slash, one digit)';

function validateNrcNumber(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'NRC number is required';
  if (!NRC_PATTERN.test(trimmed)) return NRC_FORMAT_MESSAGE;
  return null;
}

function isValidNrcNumber(value) {
  return NRC_PATTERN.test(String(value || '').trim());
}

module.exports = {
  NRC_PATTERN,
  NRC_FORMAT_MESSAGE,
  validateNrcNumber,
  isValidNrcNumber,
};
