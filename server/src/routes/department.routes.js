const router = require('express').Router();
const {
  getAllDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment,
} = require('../controllers/department.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate');
const { createDepartmentSchema, updateDepartmentSchema } = require('../validations/department.validation');

router.use(authenticate);

router.get('/', getAllDepartments);
router.get('/:id', getDepartmentById);
router.post('/', authorize('ADMIN'), validate(createDepartmentSchema), createDepartment);
router.patch('/:id', authorize('ADMIN'), validate(updateDepartmentSchema), updateDepartment);
router.delete('/:id', authorize('ADMIN'), deleteDepartment);

module.exports = router;
