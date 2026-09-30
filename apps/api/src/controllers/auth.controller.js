const AuthService = require('../services/auth.service');
const { sendError } = require('../utils/httpError');

const AuthController = {

  async register(req, res) {
    try {
      const { full_name, email, password, role, phone, accepted_terms } = req.body;

      const { user, token } = await AuthService.register({
        full_name,
        email,
        password,
        role,
        phone,
        accepted_terms: accepted_terms === true || accepted_terms === 'true',
      });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: { user, token }
      });
    } catch (err) {
      return sendError(res, err, 'Registration failed');
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const { user, token } = await AuthService.login({ email, password });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { user, token }
      });
    } catch (err) {
      return sendError(res, err, 'Login failed');
    }
  },

  async me(req, res) {
    return res.status(200).json({
      success: true,
      data: { user: req.user }
    });
  },

  async updateMe(req, res) {
    try {
      const user = await AuthService.updateProfile(req.user.id, {
        full_name: req.body.full_name,
        phone: req.body.phone,
      });
      return res.status(200).json({
        success: true,
        message: 'Profile updated',
        data: { user },
      });
    } catch (err) {
      return sendError(res, err, 'Failed to update profile');
    }
  },

  async uploadPhoto(req, res) {
    try {
      const user = await AuthService.uploadProfilePhoto(req.user.id, req);
      return res.status(200).json({
        success: true,
        message: 'Profile photo updated',
        data: { user },
      });
    } catch (err) {
      return sendError(res, err, 'Failed to upload profile photo');
    }
  },

  async forgotPassword(req, res) {
    try {
      const result = await AuthService.requestPasswordReset(req.body.email);
      return res.status(200).json({ success: true, message: result.message });
    } catch (err) {
      return sendError(res, err, 'Could not process password reset');
    }
  },

  async resetPassword(req, res) {
    try {
      const result = await AuthService.resetPassword({
        token: req.body.token,
        password: req.body.password,
      });
      return res.status(200).json({ success: true, message: result.message });
    } catch (err) {
      return sendError(res, err, 'Could not reset password');
    }
  },

};

module.exports = AuthController;
