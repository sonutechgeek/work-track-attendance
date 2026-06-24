const router = require('express').Router();
const {
  getAdminDashboard, getAttendanceSummary, getLeaveSummary, getMonthlyReport,
} = require('../controllers/report.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

router.use(authenticate);

router.get('/dashboard', authorize('ADMIN'), getAdminDashboard);
router.get('/attendance-summary', authorize('ADMIN', 'MANAGER'), getAttendanceSummary);
router.get('/leave-summary', authorize('ADMIN', 'MANAGER'), getLeaveSummary);
router.get('/monthly', authorize('ADMIN'), getMonthlyReport);

module.exports = router;
