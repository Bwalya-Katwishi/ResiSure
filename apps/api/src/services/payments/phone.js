function normalizeZmPhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('260') && digits.length === 12) {
    digits = `0${digits.slice(3)}`;
  }
  if (digits.length === 9 && /^[79]/.test(digits)) {
    digits = `0${digits}`;
  }
  return digits;
}

function validateZmPhone(phone) {
  const normalized = normalizeZmPhone(phone);
  if (!/^0[79]\d{8}$/.test(normalized)) {
    throw {
      status: 400,
      message: 'Enter a valid Zambian mobile number (e.g. 0961234567 or 0971234567)',
    };
  }
  return normalized;
}

function detectNetwork(phone) {
  const normalized = normalizeZmPhone(phone);
  if (/^0(96|76)/.test(normalized)) return 'mtn_momo';
  if (/^0(97|77)/.test(normalized)) return 'airtel_money';
  if (/^0(95|75)/.test(normalized)) return 'zamtel';
  return null;
}

function toMsisdn260(phone) {
  const normalized = validateZmPhone(phone);
  return `260${normalized.slice(1)}`;
}

function toNationalMsisdn(phone) {
  return validateZmPhone(phone).slice(1);
}

function networkLabel(id) {
  return {
    mtn_momo: 'MTN MoMo',
    airtel_money: 'Airtel Money',
    zamtel: 'Zamtel',
    mock: 'ResiSure mock payment',
  }[id] || id;
}

module.exports = {
  normalizeZmPhone,
  validateZmPhone,
  detectNetwork,
  toMsisdn260,
  toNationalMsisdn,
  networkLabel,
};
