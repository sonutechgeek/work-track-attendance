const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { sendResponse } = require('../utils/apiResponse');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

// POST /api/v1/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, name: true, email: true, role: true,
        password: true, isActive: true, failedLogins: true,
        lockUntil: true, departmentId: true, managerId: true, avatar: true,
      },
    });

    if (!user) return next(new AppError('Invalid email or password', 401));
    if (!user.isActive) return next(new AppError('Account is deactivated. Contact admin.', 403));

    // Check account lockout
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.lockUntil) - new Date()) / 60000);
      return next(new AppError(`Account locked. Try again in ${minutesLeft} minute(s).`, 423));
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const newFailedLogins = (user.failedLogins || 0) + 1;
      const updateData = { failedLogins: newFailedLogins };

      if (newFailedLogins >= 5) {
        updateData.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
        updateData.failedLogins = 0;
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });
      return next(new AppError('Invalid email or password', 401));
    }

    // Success — reset lockout fields
    const { accessToken, refreshToken } = generateTokens(user);
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockUntil: null, lastLogin: new Date(), refreshToken: hashedRefresh },
    });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    const { password: _, refreshToken: __, failedLogins: ___, lockUntil: ____, ...safeUser } = user;

    return sendResponse(res, 200, 'Login successful', { accessToken, user: safeUser });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/logout
const logout = async (req, res, next) => {
  try {
    if (req.user?.id) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null },
      });
    }
    res.clearCookie('refreshToken');
    return sendResponse(res, 200, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/refresh
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return next(new AppError('Refresh token required', 401));

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return next(new AppError('Invalid or expired refresh token', 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, isActive: true, refreshToken: true },
    });

    if (!user || !user.isActive || !user.refreshToken) {
      return next(new AppError('Session expired. Please login again.', 401));
    }

    const isValid = await bcrypt.compare(token, user.refreshToken);
    if (!isValid) return next(new AppError('Invalid refresh token', 401));

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    const hashedRefresh = await bcrypt.hash(newRefreshToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefresh },
    });

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
    return sendResponse(res, 200, 'Token refreshed', { accessToken });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, role: true,
        employeeId: true, phone: true, avatar: true,
        isActive: true, lastLogin: true, createdAt: true,
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, email: true } },
      },
    });
    return sendResponse(res, 200, 'Profile fetched', user);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/auth/me/password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true },
    });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return next(new AppError('Current password is incorrect', 400));

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

    return sendResponse(res, 200, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { login, logout, refreshToken, getMe, changePassword };
