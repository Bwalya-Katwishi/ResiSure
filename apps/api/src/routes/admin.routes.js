const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const pool = require('../config/database');

router.use(protect, restrictTo('admin'));

// Get all landlords
router.get('/landlords', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id AS user_id, u.full_name, u.email, u.phone, 
             lp.verification_status, lp.id AS profile_id
      FROM users u
      JOIN landlord_profiles lp ON u.id = lp.user_id
      ORDER BY lp.verification_status ASC, u.created_at DESC
    `);
    res.json({ success: true, data: { landlords: result.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Verify or reject a landlord
router.put('/landlords/:userId/verify', async (req, res) => {
  const { status } = req.body;
  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be verified or rejected' });
  }
  try {
    await pool.query(
      `UPDATE landlord_profiles 
       SET verification_status = $1, verified_at = NOW() 
       WHERE user_id = $2`,
      [status, req.params.userId]
    );
    res.json({ success: true, message: `Landlord ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all open disputes
router.get('/disputes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, b.amount, b.id AS booking_id, 
             u.full_name AS raised_by_name
      FROM disputes d
      JOIN bookings b ON d.booking_id = b.id
      JOIN users u ON d.raised_by = u.id
      WHERE d.resolution = 'pending'
      ORDER BY d.created_at DESC
    `);
    res.json({ success: true, data: { disputes: result.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;