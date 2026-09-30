const LandlordService = require('../services/landlord.service');
const { sendError } = require('../utils/httpError');
const { AppError } = require('../errors/AppError');

const LandlordController = {
  async getMyProfile(req, res) {
    try {
      const profile = await LandlordService.getProfile(req.user.id);
      if (!profile) {
        return sendError(res, new AppError(404, 'Landlord profile not found'), 'Landlord profile not found');
      }
      return res.status(200).json({ success: true, data: { profile } });
    } catch (err) {
      return sendError(res, err, 'Failed to fetch profile');
    }
  },

  async submitVerification(req, res) {
    try {
      const profile = await LandlordService.submitVerification(
        req.user.id,
        { nrc_number: req.body.nrc_number },
        req.files || {}
      );
      return res.status(200).json({
        success: true,
        message: 'Verification documents submitted. An admin will review your account.',
        data: { profile },
      });
    } catch (err) {
      return sendError(res, err, 'Failed to submit verification');
    }
  },

  async downloadMyDocument(req, res) {
    try {
      const docType = req.query.type === 'nrc' ? 'nrc' : 'land';
      await LandlordService.streamVerificationDocument(req.user.id, docType, res);
    } catch (err) {
      if (!res.headersSent) {
        return sendError(res, err, 'Failed to download document');
      }
    }
  },
};

module.exports = LandlordController;
