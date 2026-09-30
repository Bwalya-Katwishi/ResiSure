const nodemailer = require('nodemailer');
const { BRAND } = require('@resisure/shared/constants/brand');

let transporter = null;

function enabled() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function getTransport() {
  if (!enabled()) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

function clientUrl() {
  return process.env.CLIENT_URL || 'http://localhost:3000';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapHtml({ title, message, link, linkLabel = 'Open in ResiSure' }) {
  const url = link ? `${clientUrl()}${link}` : null;
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  return `<!doctype html>
<html><body style="margin:0;background:${BRAND.light};font-family:Arial,sans-serif;color:#1e293b;">
  <div style="max-width:560px;margin:32px auto;background:${BRAND.white};border:1px solid #dbeafe;border-radius:12px;padding:32px;">
    <p style="letter-spacing:.12em;text-transform:uppercase;font-size:11px;color:${BRAND.primary};margin:0 0 16px;font-weight:bold;">ResiSure</p>
    <h1 style="font-size:24px;margin:0 0 16px;color:${BRAND.dark};">${safeTitle}</h1>
    <p style="line-height:1.6;font-size:16px;color:#334155;">${safeMessage}</p>
    ${url ? `<p style="margin-top:24px;"><a href="${url}" style="display:inline-block;background:${BRAND.primary};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">${escapeHtml(linkLabel)}</a></p>` : ''}
    <p style="margin-top:32px;font-size:12px;color:#64748b;">Verified student accommodation with payment protection · Lusaka</p>
  </div>
</body></html>`;
}

const EmailService = {
  enabled,

  async send({ to, subject, message, link, linkLabel }) {
    const transport = getTransport();
    if (!transport || !to) return { skipped: true };
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text: message + (link ? `\n${clientUrl()}${link}` : ''),
      html: wrapHtml({ title: subject, message, link, linkLabel }),
    });
    return { sent: true };
  },

  async sendWelcome({ to, full_name, role }) {
    const firstName = String(full_name || 'there').trim().split(/\s+/)[0];
    const dashboardPath = role === 'landlord' ? '/dashboard/landlord' : '/dashboard/student';
    const roleHint =
      role === 'landlord'
        ? 'You can list your property and manage booking requests from your landlord dashboard.'
        : 'You can browse verified rooms and book with payment protection from your student dashboard.';

    return this.send({
      to,
      subject: 'Welcome to ResiSure',
      message: `Hi ${firstName},\n\nThanks for creating your ResiSure account. ${roleHint}\n\nYour rent stays protected until you confirm move-in. If you did not create this account, please contact support.`,
      link: dashboardPath,
      linkLabel: role === 'landlord' ? 'Go to landlord dashboard' : 'Browse rooms',
    });
  },
};

module.exports = EmailService;
