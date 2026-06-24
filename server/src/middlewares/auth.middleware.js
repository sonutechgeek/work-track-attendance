const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Access token required', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        managerId: true,
        isActive: true,
      },
    });

    if (!user) return next(new AppError('User not found', 401));
    if (!user.isActive) return next(new AppError('Account is deactivated', 403));

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new AppError('Access token expired', 401));
    if (err.name === 'JsonWebTokenError') return next(new AppError('Invalid access token', 401));
    next(err);
  }
};

module.exports = { authenticate };
