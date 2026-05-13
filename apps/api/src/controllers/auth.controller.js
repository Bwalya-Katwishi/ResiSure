const AuthService = require('../services/auth.service');

const AuthController = {

  async register(req, res) {
    try {
      const { full_name, email, password, role, phone } = req.body;

      if (!full_name || !email || !password || !role) {
        return res.status(400).json({
          success: false,
          message: 'full_name, email, password and role are required'
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters'
        });
      }

      const { user, token } = await AuthService.register({ full_name, email, password, role, phone });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: { user, token }
      });

    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Registration failed'
      });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const { user, token } = await AuthService.login({ email, password });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { user, token }
      });

    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Login failed'
      });
    }
  },

  async me(req, res) {
    return res.status(200).json({
      success: true,
      data: { user: req.user }
    });
  },

};

module.exports = AuthController;