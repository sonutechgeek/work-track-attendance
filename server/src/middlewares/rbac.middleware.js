const AppError = require('../utils/AppError');
const prisma = require('../config/prisma');

// Role guard — usage: authorize('ADMIN', 'MANAGER')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Not authenticated', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// Manager scope guard — verifies that a target employee reports to the requesting manager
const checkManagerScope = async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') return next(); // Admins bypass scope

    const targetId = parseInt(req.params.employeeId || req.params.id);
    if (!targetId) return next();

    const target = await prisma.user.findFirst({
      where: { id: targetId, managerId: req.user.id },
      select: { id: true },
    });

    if (!target) {
      return next(new AppError('Employee not found or not in your team', 403));
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authorize, checkManagerScope };
