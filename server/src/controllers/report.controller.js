const prisma = require('../config/prisma');
const { sendResponse } = require('../utils/apiResponse');

// GET /api/v1/reports/dashboard  (Admin)
const getAdminDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [
      totalEmployees,
      totalDepartments,
      presentToday,
      pendingLeaves,
      leavesToday,
      monthlyAttendanceSummary,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true, role: { not: 'ADMIN' } } }),
      prisma.department.count({ where: { isActive: true } }),
      prisma.attendance.count({
        where: { date: todayStart, status: { in: ['PRESENT', 'WFH', 'FIELD_VISIT'] } },
      }),
      prisma.leave.count({ where: { status: 'PENDING' } }),
      prisma.attendance.count({ where: { date: todayStart, status: 'LEAVE' } }),
      prisma.attendance.groupBy({
        by: ['status'],
        where: {
          date: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lte: todayStart,
          },
        },
        _count: { status: true },
      }),
    ]);

    return sendResponse(res, 200, 'Admin dashboard data', {
      today: { date: todayStart, presentToday, leavesToday, pendingLeaves },
      totals: { totalEmployees, totalDepartments },
      monthlyAttendanceSummary: monthlyAttendanceSummary.map((g) => ({
        status: g.status, count: g._count.status,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/reports/attendance-summary  (Admin/Manager)
const getAttendanceSummary = async (req, res, next) => {
  try {
    const { from, to, departmentId, employeeId } = req.query;

    const where = {};
    if (from) where.date = { ...where.date, gte: new Date(from) };
    if (to) where.date = { ...where.date, lte: new Date(to) };
    if (departmentId) where.employee = { departmentId: parseInt(departmentId) };

    // Manager scope
    if (req.user.role === 'MANAGER') {
      const teamIds = (await prisma.user.findMany({
        where: { managerId: req.user.id, isActive: true },
        select: { id: true },
      })).map((u) => u.id);
      where.employeeId = { in: teamIds };
    } else if (employeeId) {
      where.employeeId = parseInt(employeeId);
    }

    const summary = await prisma.attendance.groupBy({
      by: ['employeeId', 'status'],
      where,
      _count: { status: true },
    });

    // Fetch employee details for display
    const empIds = [...new Set(summary.map((s) => s.employeeId))];
    const employees = await prisma.user.findMany({
      where: { id: { in: empIds } },
      select: { id: true, name: true, employeeId: true, department: { select: { name: true } } },
    });
    const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

    const grouped = {};
    for (const row of summary) {
      if (!grouped[row.employeeId]) {
        grouped[row.employeeId] = { employee: empMap[row.employeeId], statuses: {} };
      }
      grouped[row.employeeId].statuses[row.status] = row._count.status;
    }

    return sendResponse(res, 200, 'Attendance summary', Object.values(grouped));
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/reports/leave-summary  (Admin/Manager)
const getLeaveSummary = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear(), departmentId } = req.query;

    const where = { year: parseInt(year) };

    if (req.user.role === 'MANAGER') {
      const teamIds = (await prisma.user.findMany({
        where: { managerId: req.user.id, isActive: true },
        select: { id: true },
      })).map((u) => u.id);
      where.employeeId = { in: teamIds };
    } else if (departmentId) {
      const deptEmployees = await prisma.user.findMany({
        where: { departmentId: parseInt(departmentId), isActive: true },
        select: { id: true },
      });
      where.employeeId = { in: deptEmployees.map((e) => e.id) };
    }

    const balances = await prisma.leaveBalance.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, employeeId: true, department: { select: { name: true } } },
        },
      },
      orderBy: { employee: { name: 'asc' } },
    });

    return sendResponse(res, 200, 'Leave balance summary', balances);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/reports/monthly  (Admin — monthly breakdown)
const getMonthlyReport = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear(), month, departmentId } = req.query;
    const y = parseInt(year);
    const m = month ? parseInt(month) - 1 : new Date().getMonth();

    const startOfMonth = new Date(y, m, 1);
    const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59);

    const where = { date: { gte: startOfMonth, lte: endOfMonth } };
    if (departmentId) where.employee = { departmentId: parseInt(departmentId) };

    const [attendance, leaves] = await Promise.all([
      prisma.attendance.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      prisma.leave.groupBy({
        by: ['type', 'status'],
        where: {
          startDate: { lte: endOfMonth },
          endDate: { gte: startOfMonth },
          ...(departmentId && { employee: { departmentId: parseInt(departmentId) } }),
        },
        _count: { type: true },
      }),
    ]);

    return sendResponse(res, 200, 'Monthly report', {
      period: { year: y, month: m + 1 },
      attendance: attendance.map((g) => ({ status: g.status, count: g._count.status })),
      leaves: leaves.map((g) => ({ type: g.type, status: g.status, count: g._count.type })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAdminDashboard, getAttendanceSummary, getLeaveSummary, getMonthlyReport };
