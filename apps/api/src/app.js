const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/auth.routes');
const propertyRoutes = require('./routes/property.routes');
const authRoutes = require('./routes/auth.routes');
const propertyRoutes = require('./routes/property.routes');
const bookingRoutes = require('./routes/booking.routes');

const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(morgan('dev'));

// Health check — always useful for deployment
app.get('/health', (req, res) => {
  res.json({ status: 'ok', project: 'ResiSure API', version: '1.0.0' });
});

// Routes will be added here as we build them
// app.use('/api/auth', authRoutes);
// app.use('/api/properties', propertyRoutes);
// app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);

// Global error handler — catches anything thrown in routes
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

module.exports = app;