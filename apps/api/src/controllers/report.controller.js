const ReportService = require('../services/report.service');
const { sendError } = require('../utils/httpError');

const ReportController = {
  async create(req, res) {
    try {
      const report = await ReportService.create(req.user.id, req.body);
      return res.status(201).json({
        success: true,
        message: 'Report submitted. Our team will review it.',
        data: { report: { id: report.id, status: report.status, created_at: report.created_at } },
      });
    } catch (err) {
      return sendError(res, err, 'Failed to submit report');
    }
  },

  async myReports(req, res) {
    try {
      const reports = await ReportService.listForReporter(req.user.id);
      return res.json({ success: true, data: { reports } });
    } catch (err) {
      return sendError(res, err, 'Failed to load reports');
    }
  },
};

module.exports = ReportController;
