const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { sendResponse } = require('../utils/apiResponse');
const { emitToUser, emitToAdmin } = require('../config/socket');

// Always produce UTC-midnight so Prisma's WHERE comparison matches @db.Date exactly.
// getFullYear/Month/Date read the LOCAL (server) date so "today" is correct for IST.
const toDateOnly = (d) => {
  const dt = new Date(d);
  return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
};

// POST /api/v1/attendance/check-in  (Employee)
const checkIn = async (req, res, next) => {
  try {
    const today = toDateOnly(new Date());
    const employeeId = req.user.id;

    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (existing) {
      if (existing.checkInTime) return next(new AppError('Already checked in today', 400));
    }

    const { lat, lng, address } = req.body;

    const record = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      update: { checkInTime: new Date(), checkInLat: lat, checkInLng: lng, checkInAddress: address, status: 'PRESENT' },
      create: {
        employeeId, date: today,
        checkInTime: new Date(), checkInLat: lat, checkInLng: lng,
        checkInAddress: address, status: 'PRESENT',
      },
    });

    emitToUser(employeeId, 'attendance:checkedIn', { checkInTime: record.checkInTime });
    return sendResponse(res, 200, 'Check-in recorded', record);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/attendance/check-out  (Employee)
const checkOut = async (req, res, next) => {
  try {
    const today = toDateOnly(new Date());
    const employeeId = req.user.id;

    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (!existing || !existing.checkInTime) {
      return next(new AppError('No active check-in found for today', 400));
    }
    if (existing.checkOutTime) return next(new AppError('Already checked out today', 400));

    const checkOutTime = new Date();
    const { lat, lng, address } = req.body;
    const workingHours = parseFloat(
      ((checkOutTime - existing.checkInTime) / 3600000).toFixed(2)
    );

    const record = await prisma.attendance.update({
      where: { employeeId_date: { employeeId, date: today } },
      data: {
        checkOutTime, checkOutLat: lat, checkOutLng: lng,
        checkOutAddress: address, workingHours,
      },
    });

    emitToUser(employeeId, 'attendance:checkedOut', { checkOutTime: record.checkOutTime, workingHours });
    return sendResponse(res, 200, 'Check-out recorded', record);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/attendance/today  (Employee — own today's record)
const getTodayAttendance = async (req, res, next) => {
  try {
    const today = toDateOnly(new Date());
    const record = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: req.user.id, date: today } },
    });
    return sendResponse(res, 200, 'Today attendance fetched', record);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/attendance/my  (Employee — own history with date/status filter)
const getMyAttendance = async (req, res, next) => {
  try {
    const { from, to, status, page = 1, limit = 31 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { employeeId: req.user.id };
    if (status) where.status = status;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { date: 'desc' },
      }),
      prisma.attendance.count({ where }),
    ]);

    return sendResponse(res, 200, 'Attendance history fetched', {
      records,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/attendance/team  (Manager — team attendance)
const getTeamAttendance = async (req, res, next) => {
  try {
    const { from, to, employeeId, status, search, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Only fetch team members under this manager
    const teamIds = (await prisma.user.findMany({
      where: { managerId: req.user.id, isActive: true },
      select: { id: true },
    })).map((u) => u.id);

    const where = { employeeId: { in: teamIds } };
    if (employeeId && teamIds.includes(parseInt(employeeId))) {
      where.employeeId = parseInt(employeeId);
    }
    if (status) where.status = status;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    if (search) {
      where.employee = { OR: [
        { name: { contains: search } },
        { employeeId: { contains: search } },
      ]};
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where, skip, take: parseInt(limit),
        orderBy: [{ date: 'desc' }, { employeeId: 'asc' }],
        include: { employee: { select: { id: true, name: true, employeeId: true } } },
      }),
      prisma.attendance.count({ where }),
    ]);

    return sendResponse(res, 200, 'Team attendance fetched', {
      records,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/attendance  (Admin — all employees)
const getAllAttendance = async (req, res, next) => {
  try {
    const { from, to, employeeId, departmentId, status, search, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (employeeId) where.employeeId = parseInt(employeeId);
    if (status) where.status = status;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    if (departmentId || search) {
      where.employee = {};
      if (departmentId) where.employee.departmentId = parseInt(departmentId);
      if (search) where.employee.OR = [
        { name: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where, skip, take: parseInt(limit),
        orderBy: [{ date: 'desc' }, { employeeId: 'asc' }],
        include: {
          employee: {
            select: {
              id: true, name: true, employeeId: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return sendResponse(res, 200, 'All attendance fetched', {
      records,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/attendance/:id  (Admin — manual correction)
const updateAttendance = async (req, res, next) => {
  try {
    const record = await prisma.attendance.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    return sendResponse(res, 200, 'Attendance updated', record);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/attendance/live-timer  (Employee — get check-in time for timer sync)
const getLiveTimer = async (req, res, next) => {
  try {
    const today = toDateOnly(new Date());
    const record = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: req.user.id, date: today } },
      select: { checkInTime: true, checkOutTime: true, status: true },
    });

    if (!record || !record.checkInTime) {
      return sendResponse(res, 200, 'Not checked in', { active: false });
    }
    if (record.checkOutTime) {
      return sendResponse(res, 200, 'Already checked out', { active: false, checkOutTime: record.checkOutTime });
    }

    return sendResponse(res, 200, 'Timer running', {
      active: true,
      checkInTime: record.checkInTime,
      elapsedMs: Date.now() - new Date(record.checkInTime).getTime(),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  checkIn, checkOut, getTodayAttendance, getMyAttendance,
  getTeamAttendance, getAllAttendance, updateAttendance, getLiveTimer,
};
