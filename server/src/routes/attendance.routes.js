const router = require('express').Router();
const {
  checkIn, checkOut, getTodayAttendance, getMyAttendance,
  getTeamAttendance, getAllAttendance, updateAttendance, getLiveTimer,
} = require('../controllers/attendance.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate');
const { checkInSchema, checkOutSchema, updateAttendanceSchema } = require('../validations/attendance.validation');

router.use(authenticate);

// Employee routes
router.get('/live-timer', getLiveTimer);
router.get('/today', getTodayAttendance);
router.get('/my', getMyAttendance);
router.post('/check-in', validate(checkInSchema), checkIn);
router.post('/check-out', validate(checkOutSchema), checkOut);

// Manager routes
router.get('/team', authorize('ADMIN', 'MANAGER'), getTeamAttendance);

// Admin routes
router.get('/', authorize('ADMIN'), getAllAttendance);
router.patch('/:id', authorize('ADMIN'), validate(updateAttendanceSchema), updateAttendance);

module.exports = router;
