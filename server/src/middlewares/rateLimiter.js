const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';

// In development, use a pass-through middleware so rate limits never block
const passThrough = (req, res, next) => next();

const loginLimiter = isDev ? passThrough : rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  message: { success: false, message: 'Too many login attempts. Try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = isDev ? passThrough : rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, apiLimiter };
