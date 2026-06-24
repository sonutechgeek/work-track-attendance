const router = require('express').Router();
const {
  getAllUsers, getUserById, createUser, updateUser, deleteUser,
  assignManager, getMyTeam, updateMyProfile, getLeaveBalance, updateLeaveBalance,
} = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate');
const {
  createUserSchema, updateUserSchema, updateProfileSchema,
  assignManagerSchema,
} = require('../validations/user.validation');
const { updateBalanceSchema } = require('../validations/leave.validation');

router.use(authenticate);

// Employee routes
router.get('/my-team', authorize('MANAGER'), getMyTeam);
router.patch('/my-profile', validate(updateProfileSchema), updateMyProfile);

// Admin routes
router.get('/', authorize('ADMIN'), getAllUsers);
router.post('/', authorize('ADMIN'), validate(createUserSchema), createUser);
router.get('/:id', authorize('ADMIN'), getUserById);
router.patch('/:id', authorize('ADMIN'), validate(updateUserSchema), updateUser);
router.delete('/:id', authorize('ADMIN'), deleteUser);
router.patch('/:id/assign-manager', authorize('ADMIN'), validate(assignManagerSchema), assignManager);
router.get('/:id/leave-balance', authorize('ADMIN', 'MANAGER'), getLeaveBalance);
router.patch('/:id/leave-balance', authorize('ADMIN'), validate(updateBalanceSchema), updateLeaveBalance);

module.exports = router;
