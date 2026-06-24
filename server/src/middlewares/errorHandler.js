const { Prisma } = require('@prisma/client');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id || null,
  });

  // Known operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        // meta.target is a string in MySQL (constraint name) or array in Postgres
        const target = err.meta?.target ?? '';
        const raw = Array.isArray(target) ? target.join('_') : String(target);

        // Map known unique fields to human-readable messages
        const FIELD_MESSAGES = {
          email:      'A user with this email address already exists',
          employeeid: 'A user with this Employee ID already exists',
          phone:      'A user with this phone number already exists',
          name:       'A record with this name already exists',
        };

        // Check if the constraint name contains any known field keyword
        const lower = raw.toLowerCase();
        const matched = Object.keys(FIELD_MESSAGES).find((k) => lower.includes(k));
        const message = matched ? FIELD_MESSAGES[matched] : 'This record already exists';

        return res.status(409).json({ success: false, message });
      }
      case 'P2025':
        return res.status(404).json({ success: false, message: 'Record not found' });
      case 'P2003':
        return res.status(400).json({ success: false, message: 'Referenced record does not exist' });
      case 'P2014':
        return res.status(400).json({ success: false, message: 'Relation violation' });
      default:
        return res.status(400).json({ success: false, message: 'Database error', code: err.code });
    }
  }

  // Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ success: false, message: 'Invalid data provided' });
  }

  // Unknown errors — never expose internals
  return res.status(500).json({ success: false, message: 'Internal server error' });
};

module.exports = errorHandler;
