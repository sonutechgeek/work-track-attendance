const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { sendResponse } = require('../utils/apiResponse');

const CURRENT_YEAR = new Date().getFullYear();

// GET /api/v1/users  (Admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, departmentId, search, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (role) where.role = role;
    if (departmentId) where.departmentId = parseInt(departmentId);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true,
          employeeId: true, phone: true, avatar: true,
          isActive: true, lastLogin: true, createdAt: true,
          department: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return sendResponse(res, 200, 'Users fetched', {
      users,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/users/:id  (Admin only)
const getUserById = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true, name: true, email: true, role: true,
        employeeId: true, phone: true, avatar: true,
        isActive: true, lastLogin: true, createdAt: true,
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, email: true } },
        leaveBalances: {
          where: { year: CURRENT_YEAR },
          select: {
            year: true, casualTotal: true, casualUsed: true,
            sickTotal: true, sickUsed: true,
            halfDayTotal: true, halfDayUsed: true,
            wfhTotal: true, wfhUsed: true,
          },
        },
      },
    });

    if (!user) return next(new AppError('User not found', 404));
    return sendResponse(res, 200, 'User fetched', user);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/users  (Admin only)
const createUser = async (req, res, next) => {
  try {
    const { password, ...rest } = req.body;
    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { ...rest, password: hashed },
        select: {
          id: true, name: true, email: true, role: true,
          employeeId: true, phone: true, isActive: true, createdAt: true,
        },
      });

      // Seed leave balance for current year
      await tx.leaveBalance.create({
        data: { employeeId: created.id, year: CURRENT_YEAR },
      });

      return created;
    });

    return sendResponse(res, 201, 'User created successfully', user);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/users/:id  (Admin only)
const updateUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.update({
      where: { id: userId },
      data: req.body,
      select: {
        id: true, name: true, email: true, role: true,
        employeeId: true, phone: true, isActive: true,
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });
    return sendResponse(res, 200, 'User updated', user);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/users/:id  (Admin only) — soft delete
const deleteUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) return next(new AppError('Cannot deactivate your own account', 400));

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false, refreshToken: null },
    });
    return sendResponse(res, 200, 'User deactivated');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/users/:id/assign-manager  (Admin only)
const assignManager = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { managerId } = req.body;

    if (managerId && managerId === userId) {
      return next(new AppError('User cannot be their own manager', 400));
    }

    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { role: true, isActive: true },
      });
      if (!manager || !manager.isActive) return next(new AppError('Manager not found or inactive', 404));
      if (manager.role === 'EMPLOYEE') return next(new AppError('Manager must have MANAGER or ADMIN role', 400));
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { managerId: managerId || null },
      select: { id: true, name: true, managerId: true, manager: { select: { id: true, name: true } } },
    });
    return sendResponse(res, 200, 'Manager assigned', user);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/users/my-team  (Manager only)
const getMyTeam = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { managerId: req.user.id, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }

    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { name: 'asc' },
        select: {
          id: true, name: true, email: true, role: true,
          employeeId: true, phone: true, avatar: true, lastLogin: true,
          department: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return sendResponse(res, 200, 'Team fetched', {
      members,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/users/my-profile  (All roles)
const updateMyProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, phone, avatar },
      select: { id: true, name: true, email: true, phone: true, avatar: true },
    });
    return sendResponse(res, 200, 'Profile updated', user);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/users/:id/leave-balance  (Admin / Manager for team)
const getLeaveBalance = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const year = parseInt(req.query.year) || CURRENT_YEAR;

    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_year: { employeeId: userId, year } },
    });

    if (!balance) return next(new AppError('Leave balance not found for this year', 404));
    return sendResponse(res, 200, 'Leave balance fetched', balance);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/users/:id/leave-balance  (Admin only)
const updateLeaveBalance = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const year = parseInt(req.query.year) || CURRENT_YEAR;

    const balance = await prisma.leaveBalance.upsert({
      where: { employeeId_year: { employeeId: userId, year } },
      update: req.body,
      create: { employeeId: userId, year, ...req.body },
    });

    return sendResponse(res, 200, 'Leave balance updated', balance);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers, getUserById, createUser, updateUser, deleteUser,
  assignManager, getMyTeam, updateMyProfile, getLeaveBalance, updateLeaveBalance,
};
