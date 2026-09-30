const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/student.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { handleStudentVerificationUpload } = require('../config/verificationUpload');

router.use(protect, restrictTo('student'));

router.get('/me', StudentController.getMyProfile);
router.get('/me/verification/document', StudentController.downloadMyDocument);
router.post(
  '/me/verification',
  handleStudentVerificationUpload,
  StudentController.submitVerification
);

module.exports = router;
