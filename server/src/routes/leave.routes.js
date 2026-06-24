const router = require('express').Router();
const {
  applyLeave, getMyLeaves, getTeamPendingLeaves, getTeamAllLeaves, getAllLeaves,
  getLeaveById, approveLeave, rejectLeave, cancelLeave, getMyBalance,
} = require('../controllers/leave.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate');
const { applyLeaveSchema, reviewLeaveSchema, rejectLeaveSchema } = require('../validations/leave.validation');

router.use(authenticate);

// Employee
router.post('/', validate(applyLeaveSchema), applyLeave);
router.get('/my', getMyLeaves);
router.get('/my-balance', getMyBalance);
router.delete('/:id', cancelLeave);

// Manager
router.get('/pending', authorize('ADMIN', 'MANAGER'), getTeamPendingLeaves);
router.get('/team',    authorize('MANAGER'), getTeamAllLeaves);

// Admin
router.get('/', authorize('ADMIN'), getAllLeaves);

// Shared (scoped internally)
router.get('/:id', getLeaveById);
router.post('/:id/approve', authorize('ADMIN', 'MANAGER'), validate(reviewLeaveSchema), approveLeave);
router.post('/:id/reject', authorize('ADMIN', 'MANAGER'), validate(rejectLeaveSchema), rejectLeave);

module.exports = router;
