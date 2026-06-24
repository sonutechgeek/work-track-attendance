const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const { combine, timestamp, printf, colorize, errors } = winston.format;

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new DailyRotateFile({
      filename: path.join('logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxFiles: '30d',
    }),
    new DailyRotateFile({
      filename: path.join('logs', 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxFiles: '14d',
    }),
  ],
});

module.exports = logger;
