const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', NotificationController.list);
router.put('/read-all', NotificationController.markAllRead);
router.put('/:id/read', NotificationController.markRead);

module.exports = router;
