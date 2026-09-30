const PaymentService = require('../services/payment.service');

const EscrowService = require('../services/escrow.service');

const { providers } = require('../services/payments');

const { sendError } = require('../utils/httpError');



function webhookAuthorized(req) {

  const expected = process.env.PAYMENTS_WEBHOOK_SECRET;

  if (!expected) {

    return process.env.NODE_ENV !== 'production';

  }

  const token = req.query.token || req.headers['x-resisure-webhook-secret'];

  return token === expected;

}



function extractReference(body = {}) {

  return (

    body.reference

    || body.externalId

    || body.financialTransactionId

    || body.ConversationId

    || body.conversationId

    || body.data?.transaction?.id

    || body.transaction?.id

    || null

  );

}



const WEBHOOK_ALIASES = {

  mtn: 'mtn_momo',

  airtel: 'airtel_money',

  zamtel: 'zamtel_kwacha',

  mtn_momo: 'mtn_momo',

  airtel_money: 'airtel_money',

  zamtel_kwacha: 'zamtel_kwacha',

};



const PaymentController = {

  methods(_req, res) {

    return res.json({ success: true, data: PaymentService.describeMethods() });

  },



  async bookingStatus(req, res) {

    try {

      const data = await PaymentService.getBookingPaymentStatus(req.params.bookingId, req.user.id);

      return res.json({ success: true, data });

    } catch (err) {

      return sendError(res, err, 'Failed to fetch payment status');

    }

  },



  async reconcile(req, res) {

    try {

      const data = await PaymentService.reconcileBookingPayment(req.params.bookingId, req.user.id);

      return res.json({ success: true, data, message: 'Payment status refreshed' });

    } catch (err) {

      return sendError(res, err, 'Failed to reconcile payment');

    }

  },



  async webhook(req, res) {

    if (!webhookAuthorized(req)) {

      return res.status(401).json({ success: false, message: 'Invalid webhook secret' });

    }



    const providerName = WEBHOOK_ALIASES[req.params.provider];

    const provider = providerName && providers[providerName];

    if (!provider) {

      return res.status(404).json({ success: false, message: 'Unknown payment provider' });

    }



    if (providerName === 'zamtel_kwacha' && process.env.ZAMTEL_WEBHOOK_SECRET) {
      const token = req.query.token || req.headers['x-zamtel-webhook-secret'];
      if (token !== process.env.ZAMTEL_WEBHOOK_SECRET) {
        return res.status(401).json({ success: false, message: 'Invalid Zamtel webhook secret' });
      }
    }



    const reference = extractReference(req.body) || req.query.reference;

    if (!reference) {

      return res.status(200).json({ success: true, message: 'Ignored webhook without reference' });

    }



    try {

      let status = 'pending';

      if (typeof provider.getStatus === 'function') {

        const checked = await provider.getStatus(reference);

        status = checked.status;

      }

      if (status === 'pending') {

        return res.status(200).json({ success: true, message: 'Still pending' });

      }

      await EscrowService.finalizeByReference(reference, status);

      return res.status(200).json({ success: true, message: `Capture ${status}` });

    } catch (err) {

      if (err.status === 404 || err.status === 402) {

        return res.status(200).json({ success: true, message: err.message || 'Capture updated' });

      }

      console.error('Payment webhook failed:', err.message);

      return res.status(500).json({ success: false, message: 'Webhook processing failed' });

    }

  },

};



module.exports = PaymentController;


