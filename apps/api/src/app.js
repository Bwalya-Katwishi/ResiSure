const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');
const { isProd, corsOrigins } = require('./config/env');

const app = express();

if (process.env.TRUST_PROXY === 'true' || isProd()) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

const allowedOrigins = corsOrigins();
const allowAllCors = !isProd() && process.env.CORS_ALLOW_ALL === 'true';

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowAllCors || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(isProd() ? 'combined' : 'dev'));
}

const skipSensitive = (req) => (
  req.path === '/health'
  || req.path === '/ready'
  || /^\/api\/payments\/webhooks\//.test(req.originalUrl)
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd() ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipSensitive,
  message: { success: false, message: 'Too many requests. Try again shortly.' },
});

if (process.env.NODE_ENV !== 'test') {
  app.use('/api', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
}

app.use(
  '/uploads/properties',
  express.static(path.join(__dirname, '../uploads/properties'), {
    maxAge: isProd() ? '7d' : 0,
    fallthrough: true,
  })
);

app.use(
  '/uploads/profiles',
  express.static(path.join(__dirname, '../uploads/profiles'), {
    maxAge: isProd() ? '7d' : 0,
    fallthrough: true,
  })
);

// Verification documents are never served from a public static path
app.use('/uploads/verification', (_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', project: 'ResiSure API', version: '1.2.0' });
});

app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (_err) {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.get('/api/openapi.yaml', (_req, res) => {
  res.type('text/yaml').sendFile(path.join(__dirname, '../../../docs/openapi.yaml'));
});

const authRoutes = require('./routes/auth.routes');
const propertyRoutes = require('./routes/property.routes');
const bookingRoutes = require('./routes/booking.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notification.routes');
const landlordRoutes = require('./routes/landlord.routes');
const studentRoutes = require('./routes/student.routes');
const favoriteRoutes = require('./routes/favorite.routes');
const paymentRoutes = require('./routes/payment.routes');
const reportRoutes = require('./routes/report.routes');

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/landlords', landlordRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err.stack || err);
  }
  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Internal server error' : (err.message || 'Request failed'),
  });
});

module.exports = app;
