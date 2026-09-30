function enabled() {
  return Boolean(
    (process.env.AT_API_KEY && process.env.AT_USERNAME)
    || (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM)
  );
}

function toIntl(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('260')) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+260${digits.slice(1)}`;
  if (digits) return `+${digits}`;
  return '';
}

async function sendAfricaTalking(to, message) {
  const body = new URLSearchParams({
    username: process.env.AT_USERNAME,
    to,
    message,
  });
  if (process.env.AT_FROM) body.set('from', process.env.AT_FROM);
  const res = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      apiKey: process.env.AT_API_KEY,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Africa's Talking HTTP ${res.status}`);
  }
}

async function sendTwilio(to, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const body = new URLSearchParams({
    To: to,
    From: process.env.TWILIO_FROM,
    Body: message,
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Twilio HTTP ${res.status}`);
  }
}

const SmsService = {
  enabled,

  async send({ to, message }) {
    const dest = toIntl(to);
    if (!enabled() || !dest) return { skipped: true };
    const text = String(message).slice(0, 160);
    if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
      await sendAfricaTalking(dest, text);
    } else {
      await sendTwilio(dest, text);
    }
    return { sent: true };
  },
};

module.exports = SmsService;
