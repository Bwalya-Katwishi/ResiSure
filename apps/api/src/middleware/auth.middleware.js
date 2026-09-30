const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const { JWT_SECRET } = require('../config/jwt');

// Verifies the JWT and attaches the user to the request
const protect = async (req, res, next) => {
  try {
    // 1. Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized. No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Attach user to request
    const user = await UserModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }
    if (user.account_status === 'suspended' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Your account is suspended. Contact support for assistance.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please sign in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Not authorized. Invalid token' });
    }
    return res.status(401).json({
      success: false,
      message: err.message?.includes('does not exist')
        ? 'Auth failed due to a database issue. Run npm run migrate in apps/api.'
        : 'Not authorized. Please sign in again.',
    });
  }
};

// Restricts a route to specific roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This route is for ${roles.join(', ')} only`
      });
    }
    next();
  };
};

const optionalProtect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await UserModel.findById(decoded.id);
  } catch (_) {
    /* public listing still works without a valid token */
  }
  next();
};

module.exports = { protect, restrictTo, optionalProtect };