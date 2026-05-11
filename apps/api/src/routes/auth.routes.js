const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected route — requires valid JWT
router.get('/me', protect, AuthController.me);

module.exports = router;