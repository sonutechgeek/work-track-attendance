const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { sendResponse } = require('../utils/apiResponse');

// GET /api/v1/departments  (All authenticated)
const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        head: { select: { id: true, name: true, email: true } },
        _count: { select: { users: true } },
      },
    });
    return sendResponse(res, 200, 'Departments fetched', departments);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/departments/:id  (All authenticated)
const getDepartmentById = async (req, res, next) => {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        head: { select: { id: true, name: true, email: true } },
        employees: {
          where: { isActive: true },
          select: { id: true, name: true, email: true, role: true, employeeId: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!dept) return next(new AppError('Department not found', 404));
    return sendResponse(res, 200, 'Department fetched', dept);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/departments  (Admin only)
const createDepartment = async (req, res, next) => {
  try {
    const { name, description, headId } = req.body;

    if (headId) {
      const head = await prisma.user.findUnique({ where: { id: headId }, select: { id: true } });
      if (!head) return next(new AppError('Department head user not found', 404));
    }

    const dept = await prisma.department.create({
      data: { name, description, headId: headId || null },
      include: { head: { select: { id: true, name: true, email: true } } },
    });
    return sendResponse(res, 201, 'Department created', dept);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/departments/:id  (Admin only)
const updateDepartment = async (req, res, next) => {
  try {
    const deptId = parseInt(req.params.id);
    const { headId, ...rest } = req.body;

    if (headId !== undefined && headId !== null) {
      const head = await prisma.user.findUnique({ where: { id: headId }, select: { id: true } });
      if (!head) return next(new AppError('Department head user not found', 404));
    }

    const dept = await prisma.department.update({
      where: { id: deptId },
      data: { ...rest, headId: headId !== undefined ? headId : undefined },
      include: { head: { select: { id: true, name: true, email: true } } },
    });
    return sendResponse(res, 200, 'Department updated', dept);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/departments/:id  (Admin only)
const deleteDepartment = async (req, res, next) => {
  try {
    const deptId = parseInt(req.params.id);

    const employeeCount = await prisma.user.count({
      where: { departmentId: deptId, isActive: true },
    });

    if (employeeCount > 0) {
      return next(new AppError(`Cannot delete department with ${employeeCount} active employee(s). Reassign them first.`, 400));
    }

    await prisma.department.delete({ where: { id: deptId } });
    return sendResponse(res, 200, 'Department deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment };
