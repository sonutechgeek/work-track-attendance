const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { sendResponse } = require('../utils/apiResponse');
const { emitToUser, emitToAdmin } = require('../config/socket');

const CURRENT_YEAR = new Date().getFullYear();

// Leave types that do NOT deduct balance
const NO_DEDUCT_TYPES = ['EARLY_LEAVE', 'FIELD_VISIT'];

// Map leave type → attendance status
const LEAVE_TO_ATTENDANCE = {
  CASUAL: 'LEAVE', SICK: 'LEAVE', HALF_DAY: 'HALF_DAY',
  EARLY_LEAVE: 'PRESENT', WFH: 'WFH', FIELD_VISIT: 'FIELD_VISIT',
};

const daysBetween = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const diff = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    diff.push(new Date(d));
  }
  return diff;
};

const countWorkingDays = (days) => days.filter((d) => d.getDay() !== 0 && d.getDay() !== 6).length;

const getBalanceField = (leaveType) => {
  const map = {
    CASUAL: { total: 'casualTotal', used: 'casualUsed' },
    SICK: { total: 'sickTotal', used: 'sickUsed' },
    HALF_DAY: { total: 'halfDayTotal', used: 'halfDayUsed' },
    WFH: { total: 'wfhTotal', used: 'wfhUsed' },
  };
  return map[leaveType] || null;
};

// POST /api/v1/leaves  (Employee)
const applyLeave = async (req, res, next) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const employeeId = req.user.id;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check for overlapping pending/approved leaves
    const overlap = await prisma.leave.findFirst({
      where: {
        employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });
    if (overlap) return next(new AppError('You have an overlapping leave request for this period', 400));

    // Check balance for types that deduct
    const balanceField = getBalanceField(type);
    if (balanceField) {
      const balance = await prisma.leaveBalance.findUnique({
        where: { employeeId_year: { employeeId, year: start.getFullYear() } },
      });
      if (!balance) return next(new AppError('Leave balance record not found', 400));

      const days = countWorkingDays(daysBetween(start, end));
      const available = balance[balanceField.total] - balance[balanceField.used];
      if (days > available) {
        return next(new AppError(`Insufficient ${type} leave balance. Available: ${available}, Requested: ${days}`, 400));
      }
    }

    const leave = await prisma.leave.create({
      data: { employeeId, type, startDate: start, endDate: end, reason },
      include: { employee: { select: { id: true, name: true, email: true } } },
    });

    // Notify manager and admin
    if (req.user.managerId) {
      emitToUser(req.user.managerId, 'leave:newRequest', { leave });
    }
    emitToAdmin('leave:newRequest', { leave });

    return sendResponse(res, 201, 'Leave application submitted', leave);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/leaves/my  (Employee — own leaves)
const getMyLeaves = async (req, res, next) => {
  try {
    const { status, year, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { employeeId: req.user.id };
    if (status) where.status = status;
    if (year) {
      where.startDate = { gte: new Date(`${year}-01-01`) };
      where.endDate = { lte: new Date(`${year}-12-31`) };
    }

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { reviewedBy: { select: { id: true, name: true } } },
      }),
      prisma.leave.count({ where }),
    ]);

    return sendResponse(res, 200, 'Leaves fetched', {
      leaves,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/leaves/pending  (Admin — all pending; Manager — team pending)
const getTeamPendingLeaves = async (req, res, next) => {
  try {
    const where = { status: 'PENDING' };

    if (req.user.role === 'MANAGER') {
      const teamIds = (await prisma.user.findMany({
        where: { managerId: req.user.id, isActive: true },
        select: { id: true },
      })).map((u) => u.id);
      where.employeeId = { in: teamIds };
    }
    // ADMIN: no employee filter — sees all pending leaves

    const leaves = await prisma.leave.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        employee: {
          select: {
            id: true, name: true, employeeId: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    return sendResponse(res, 200, 'Pending leaves fetched', leaves);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/leaves  (Admin — all leaves)
const getAllLeaves = async (req, res, next) => {
  try {
    const { status, type, departmentId, employeeId, search, page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (employeeId) where.employeeId = parseInt(employeeId);
    if (departmentId || search) {
      where.employee = {};
      if (departmentId) where.employee.departmentId = parseInt(departmentId);
      if (search) where.employee.OR = [
        { name: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              id: true, name: true, employeeId: true,
              department: { select: { id: true, name: true } },
            },
          },
          reviewedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.leave.count({ where }),
    ]);

    return sendResponse(res, 200, 'All leaves fetched', {
      leaves,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/leaves/:id  (Any)
const getLeaveById = async (req, res, next) => {
  try {
    const leave = await prisma.leave.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        employee: { select: { id: true, name: true, employeeId: true, managerId: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });
    if (!leave) return next(new AppError('Leave not found', 404));

    // Scope check — employee can only see own, manager can see team's
    if (req.user.role === 'EMPLOYEE' && leave.employeeId !== req.user.id) {
      return next(new AppError('Access denied', 403));
    }
    if (req.user.role === 'MANAGER' && leave.employee.managerId !== req.user.id) {
      return next(new AppError('Access denied', 403));
    }

    return sendResponse(res, 200, 'Leave fetched', leave);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/leaves/:id/approve  (Manager or Admin)
const approveLeave = async (req, res, next) => {
  try {
    const leaveId = parseInt(req.params.id);
    const { comments } = req.body;

    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
      include: { employee: { select: { id: true, managerId: true, name: true } } },
    });

    if (!leave) return next(new AppError('Leave not found', 404));
    if (leave.status !== 'PENDING') return next(new AppError('Only pending leaves can be approved', 400));

    // Manager scope check
    if (req.user.role === 'MANAGER' && leave.employee.managerId !== req.user.id) {
      return next(new AppError('Access denied — not your team member', 403));
    }

    const leaveDays = daysBetween(leave.startDate, leave.endDate);
    const balanceField = getBalanceField(leave.type);
    const attendanceStatus = LEAVE_TO_ATTENDANCE[leave.type];
    const workingDays = countWorkingDays(leaveDays);

    await prisma.$transaction(async (tx) => {
      // 1. Update leave status
      await tx.leave.update({
        where: { id: leaveId },
        data: { status: 'APPROVED', reviewedById: req.user.id, reviewedAt: new Date(), comments },
      });

      // 2. Create/update attendance rows for each day in range
      for (const day of leaveDays) {
        if (day.getDay() === 0 || day.getDay() === 6) continue; // skip weekends
        const dateOnly = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()));
        await tx.attendance.upsert({
          where: { employeeId_date: { employeeId: leave.employeeId, date: dateOnly } },
          update: { status: attendanceStatus, note: `${leave.type} leave approved` },
          create: {
            employeeId: leave.employeeId,
            date: dateOnly,
            status: attendanceStatus,
            note: `${leave.type} leave approved`,
          },
        });
      }

      // 3. Deduct leave balance (only for applicable types)
      if (balanceField && workingDays > 0) {
        await tx.leaveBalance.updateMany({
          where: { employeeId: leave.employeeId, year: leave.startDate.getFullYear() },
          data: { [balanceField.used]: { increment: workingDays } },
        });
      }
    });

    // Notify employee
    emitToUser(leave.employeeId, 'leave:approved', { leaveId, comments });

    const updated = await prisma.leave.findUnique({
      where: { id: leaveId },
      include: { reviewedBy: { select: { id: true, name: true } } },
    });

    return sendResponse(res, 200, 'Leave approved', updated);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/leaves/:id/reject  (Manager or Admin)
const rejectLeave = async (req, res, next) => {
  try {
    const leaveId = parseInt(req.params.id);
    const { comments } = req.body;

    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
      include: { employee: { select: { id: true, managerId: true } } },
    });

    if (!leave) return next(new AppError('Leave not found', 404));
    if (leave.status !== 'PENDING') return next(new AppError('Only pending leaves can be rejected', 400));

    if (req.user.role === 'MANAGER' && leave.employee.managerId !== req.user.id) {
      return next(new AppError('Access denied — not your team member', 403));
    }

    const updated = await prisma.leave.update({
      where: { id: leaveId },
      data: { status: 'REJECTED', reviewedById: req.user.id, reviewedAt: new Date(), comments },
      include: { reviewedBy: { select: { id: true, name: true } } },
    });

    emitToUser(leave.employeeId, 'leave:rejected', { leaveId, comments });
    return sendResponse(res, 200, 'Leave rejected', updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/leaves/:id  (Employee — cancel own pending leave)
const cancelLeave = async (req, res, next) => {
  try {
    const leaveId = parseInt(req.params.id);

    const leave = await prisma.leave.findUnique({ where: { id: leaveId } });
    if (!leave) return next(new AppError('Leave not found', 404));
    if (leave.employeeId !== req.user.id) return next(new AppError('Access denied', 403));
    if (leave.status !== 'PENDING') return next(new AppError('Only pending leaves can be cancelled', 400));

    await prisma.leave.delete({ where: { id: leaveId } });
    return sendResponse(res, 200, 'Leave cancelled');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/leaves/my-balance  (Employee — own balance)
const getMyBalance = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || CURRENT_YEAR;
    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_year: { employeeId: req.user.id, year } },
    });
    if (!balance) return next(new AppError('Leave balance not found for this year', 404));
    return sendResponse(res, 200, 'Leave balance fetched', balance);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/leaves/team  (Manager — all team leaves, not just pending)
const getTeamAllLeaves = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const teamIds = (await prisma.user.findMany({
      where: { managerId: req.user.id, isActive: true },
      select: { id: true },
    })).map((u) => u.id);

    const where = { employeeId: { in: teamIds } };
    if (status) where.status = status;
    if (search) {
      where.employee = { OR: [
        { name: { contains: search } },
        { employeeId: { contains: search } },
      ]};
    }

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              id: true, name: true, employeeId: true,
              department: { select: { id: true, name: true } },
            },
          },
          reviewedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.leave.count({ where }),
    ]);

    return sendResponse(res, 200, 'Team leaves fetched', {
      leaves,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  applyLeave, getMyLeaves, getTeamPendingLeaves, getTeamAllLeaves, getAllLeaves,
  getLeaveById, approveLeave, rejectLeave, cancelLeave, getMyBalance,
};
