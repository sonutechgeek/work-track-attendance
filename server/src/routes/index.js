const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/departments', require('./department.routes'));
router.use('/attendance', require('./attendance.routes'));
router.use('/leaves', require('./leave.routes'));
router.use('/reports', require('./report.routes'));

module.exports = router;
