const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/report.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/', ReportController.create);
router.get('/my', ReportController.myReports);

module.exports = router;
