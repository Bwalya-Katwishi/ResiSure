const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { handleProfilePhotoUpload } = require('../config/cloudinary');
const { validateBody } = require('../middleware/validate');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require('../validators/auth.validator');

router.post('/register', validateBody(validateRegister), AuthController.register);
router.post('/login', validateBody(validateLogin), AuthController.login);
router.post('/forgot-password', validateBody(validateForgotPassword), AuthController.forgotPassword);
router.post('/reset-password', validateBody(validateResetPassword), AuthController.resetPassword);

router.get('/me', protect, AuthController.me);
router.patch('/me', protect, AuthController.updateMe);
router.post('/me/photo', protect, handleProfilePhotoUpload, AuthController.uploadPhoto);

module.exports = router;
