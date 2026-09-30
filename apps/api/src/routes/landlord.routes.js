const express = require('express');
const router = express.Router();
const LandlordController = require('../controllers/landlord.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { handleLandlordVerificationUpload } = require('../config/verificationUpload');

router.use(protect, restrictTo('landlord'));

router.get('/me', LandlordController.getMyProfile);
router.get('/me/verification/document', LandlordController.downloadMyDocument);
router.post(
  '/me/verification',
  handleLandlordVerificationUpload,
  LandlordController.submitVerification
);

module.exports = router;
