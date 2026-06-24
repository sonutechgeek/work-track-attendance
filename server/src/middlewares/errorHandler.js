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
        // meta.target is a string in MySQL (constraint name), array in Postgres
        const target = err.meta?.target;
        const field = Array.isArray(target) ? target[0] : (typeof target === 'string' ? target : 'Record');
        const readable = field.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
        return res.status(409).json({ success: false, message: `${readable} already exists` });
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
