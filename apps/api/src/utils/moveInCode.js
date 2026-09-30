const crypto = require('crypto');

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateMoveInCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return code;
}

function normalizeMoveInCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

module.exports = { generateMoveInCode, normalizeMoveInCode };
