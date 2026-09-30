const LandlordService = require('../services/landlord.service');
const StudentService = require('../services/student.service');
const AdminService = require('../services/admin.service');
const AuditService = require('../services/audit.service');
const ReportService = require('../services/report.service');
const RiskFlagService = require('../services/riskFlag.service');
const { sendError } = require('../utils/httpError');

const AdminController = {
  async stats(req, res) {
    try {
      const stats = await AdminService.stats();
      return res.json({ success: true, data: { stats } });
    } catch (err) {
      return sendError(res, err, 'Failed to load stats');
    }
  },

  async listUsers(req, res) {
    try {
      const users = await AdminService.listUsers();
      return res.json({ success: true, data: { users } });
    } catch (err) {
      return sendError(res, err, 'Failed to load users');
    }
  },

  async listProperties(req, res) {
    try {
      const properties = await AdminService.listProperties();
      return res.json({ success: true, data: { properties } });
    } catch (err) {
      return sendError(res, err, 'Failed to load properties');
    }
  },

  async verifyProperty(req, res) {
    try {
      const property = await AdminService.verifyProperty(req.params.id, req.user.id, {
        status: req.body.status,
        rejection_reason: req.body.rejection_reason,
      });
      return res.json({
        success: true,
        message: `Property ${req.body.status}`,
        data: { property },
      });
    } catch (err) {
      return sendError(res, err, 'Failed to update property verification');
    }
  },

  async listBookings(req, res) {
    try {
      const bookings = await AdminService.listBookings();
      return res.json({ success: true, data: { bookings } });
    } catch (err) {
      return sendError(res, err, 'Failed to load bookings');
    }
  },

  async listPayments(req, res) {
    try {
      const payments = await AdminService.listPayments();
      return res.json({ success: true, data: { payments } });
    } catch (err) {
      return sendError(res, err, 'Failed to load payments');
    }
  },

  async listEscrow(req, res) {
    try {
      const payments = await AdminService.listPayments();
      return res.json({ success: true, data: { transactions: payments } });
    } catch (err) {
      return sendError(res, err, 'Failed to load escrow ledger');
    }
  },

  async listAuditLogs(req, res) {
    try {
      const logs = await AuditService.list({
        action: req.query.action,
        entity_type: req.query.entity_type,
        limit: req.query.limit,
        offset: req.query.offset,
      });
      return res.json({ success: true, data: { logs } });
    } catch (err) {
      return sendError(res, err, 'Failed to load audit logs');
    }
  },

  async listLandlords(req, res) {
    try {
      const landlords = await AdminService.listLandlords();
      return res.json({ success: true, data: { landlords } });
    } catch (err) {
      return sendError(res, err, 'Failed to load landlords');
    }
  },

  async getLandlord(req, res) {
    try {
      const landlord = await AdminService.getLandlord(req.params.userId);
      return res.json({ success: true, data: { landlord } });
    } catch (err) {
      return sendError(res, err, 'Failed to load landlord');
    }
  },

  async streamLandlordDocument(req, res) {
    try {
      const docType = req.query.type === 'nrc' ? 'nrc' : 'land';
      await LandlordService.streamVerificationDocument(req.params.userId, docType, res);
    } catch (err) {
      if (!res.headersSent) {
        return sendError(res, err, 'Failed to download document');
      }
    }
  },

  async verifyLandlord(req, res) {
    try {
      await AdminService.verifyLandlord(req.user.id, req.params.userId, {
        status: req.body.status,
        rejection_reason: req.body.rejection_reason,
        verification_expires_at: req.body.verification_expires_at,
      });
      return res.json({ success: true, message: `Landlord ${req.body.status}` });
    } catch (err) {
      return sendError(res, err, 'Failed to update landlord');
    }
  },

  async listStudents(req, res) {
    try {
      const students = await AdminService.listStudents();
      return res.json({ success: true, data: { students } });
    } catch (err) {
      return sendError(res, err, 'Failed to load students');
    }
  },

  async getStudent(req, res) {
    try {
      const student = await AdminService.getStudent(req.params.userId);
      return res.json({ success: true, data: { student } });
    } catch (err) {
      return sendError(res, err, 'Failed to load student');
    }
  },

  async streamStudentDocument(req, res) {
    try {
      const docType = req.query.type === 'university_slip' ? 'university_slip' : 'nrc';
      await StudentService.streamVerificationDocument(req.params.userId, docType, res);
    } catch (err) {
      if (!res.headersSent) {
        return sendError(res, err, 'Failed to download document');
      }
    }
  },

  async verifyStudent(req, res) {
    try {
      await AdminService.verifyStudent(req.user.id, req.params.userId, {
        status: req.body.status,
        rejection_reason: req.body.rejection_reason,
        verification_expires_at: req.body.verification_expires_at,
      });
      return res.json({ success: true, message: `Student ${req.body.status}` });
    } catch (err) {
      return sendError(res, err, 'Failed to update student');
    }
  },

  async listReports(req, res) {
    try {
      const reports = await ReportService.listForAdmin({ status: req.query.status });
      return res.json({ success: true, data: { reports } });
    } catch (err) {
      return sendError(res, err, 'Failed to load reports');
    }
  },

  async updateReport(req, res) {
    try {
      const report = await ReportService.updateStatus(req.params.id, req.user.id, req.body);
      return res.json({ success: true, data: { report } });
    } catch (err) {
      return sendError(res, err, 'Failed to update report');
    }
  },

  async listRiskFlags(req, res) {
    try {
      const flags = await RiskFlagService.list({ status: req.query.status });
      return res.json({ success: true, data: { flags } });
    } catch (err) {
      return sendError(res, err, 'Failed to load risk flags');
    }
  },

  async reviewRiskFlag(req, res) {
    try {
      const flag = await RiskFlagService.review(req.params.id, req.user.id, req.body);
      return res.json({ success: true, data: { flag } });
    } catch (err) {
      return sendError(res, err, 'Failed to update risk flag');
    }
  },

  async listDisputes(req, res) {
    try {
      const disputes = await AdminService.listDisputes();
      return res.json({ success: true, data: { disputes } });
    } catch (err) {
      return sendError(res, err, 'Failed to load disputes');
    }
  },
};

module.exports = AdminController;
