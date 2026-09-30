const NotificationService = require('../services/notification.service');
const { sendError } = require('../utils/httpError');
const { AppError } = require('../errors/AppError');

const NotificationController = {
  async list(req, res) {
    try {
      const notifications = await NotificationService.listForUser(req.user.id);
      const unread = await NotificationService.unreadCount(req.user.id);
      return res.status(200).json({
        success: true,
        unread,
        data: { notifications },
      });
    } catch (err) {
      return sendError(res, err, 'Failed to fetch notifications');
    }
  },

  async markRead(req, res) {
    try {
      const notification = await NotificationService.markRead(req.params.id, req.user.id);
      if (!notification) {
        return sendError(res, new AppError(404, 'Notification not found'), 'Notification not found');
      }
      return res.status(200).json({ success: true, data: { notification } });
    } catch (err) {
      return sendError(res, err, 'Failed to mark notification as read');
    }
  },

  async markAllRead(req, res) {
    try {
      await NotificationService.markAllRead(req.user.id);
      return res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
      return sendError(res, err, 'Failed to mark notifications as read');
    }
  },
};

module.exports = NotificationController;
