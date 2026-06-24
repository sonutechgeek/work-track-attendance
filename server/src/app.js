const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const logger = require('./config/logger');
const { apiLimiter } = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/AppError');
const routes = require('./routes');

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// HTTP request logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// Rate limiting on all API routes
app.use('/api', apiLimiter);

// Health check (no auth required)
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Mount all API routes under /api/v1
app.use('/api/v1', routes);

// 404 catch
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
});

// Global error handler
app.use(errorHandler);

module.exports = app;
