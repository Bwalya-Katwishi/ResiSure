const EmailService = require('./email.service');
const SmsService = require('./sms.service');
const {
  EMAIL_NOTIFICATION_TYPES,
  SMS_NOTIFICATION_TYPES,
} = require('../../config/notificationPolicy');

const MessagingService = {
  async dispatch({ user, type, message, link }) {
    if (!user) return;
    const jobs = [];
    if (user.email && EMAIL_NOTIFICATION_TYPES.has(type)) {
      jobs.push(
        EmailService.send({
          to: user.email,
          subject: `ResiSure · ${String(type || 'update').replace(/_/g, ' ')}`,
          message,
          link,
        }).catch((err) => console.error('Email send failed:', err.message))
      );
    }
    if (user.phone && SMS_NOTIFICATION_TYPES.has(type)) {
      jobs.push(
        SmsService.send({ to: user.phone, message }).catch((err) => {
          console.error('SMS send failed:', err.message);
        })
      );
    }
    await Promise.all(jobs);
  },
};

module.exports = MessagingService;
