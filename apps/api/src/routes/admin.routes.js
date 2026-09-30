const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const AdminController = require('../controllers/admin.controller');

router.use(protect, restrictTo('admin'));

router.get('/stats', AdminController.stats);
router.get('/users', AdminController.listUsers);
router.get('/properties', AdminController.listProperties);
router.put('/properties/:id/verify', AdminController.verifyProperty);
router.get('/bookings', AdminController.listBookings);
router.get('/payments', AdminController.listPayments);
router.get('/escrow', AdminController.listEscrow);
router.get('/audit-logs', AdminController.listAuditLogs);
router.get('/landlords', AdminController.listLandlords);
router.get('/landlords/:userId', AdminController.getLandlord);
router.get('/landlords/:userId/verification-document', AdminController.streamLandlordDocument);
router.put('/landlords/:userId/verify', AdminController.verifyLandlord);
router.get('/students', AdminController.listStudents);
router.get('/students/:userId', AdminController.getStudent);
router.get('/students/:userId/verification-document', AdminController.streamStudentDocument);
router.put('/students/:userId/verify', AdminController.verifyStudent);
router.get('/reports', AdminController.listReports);
router.put('/reports/:id', AdminController.updateReport);
router.get('/risk-flags', AdminController.listRiskFlags);
router.put('/risk-flags/:id', AdminController.reviewRiskFlag);
router.get('/disputes', AdminController.listDisputes);

module.exports = router;
