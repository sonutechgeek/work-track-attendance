require('dotenv').config();
const http = require('http');
const app = require('./app');
const logger = require('./config/logger');
const { initSocket } = require('./config/socket');
const prisma = require('./config/prisma');

const PORT = parseInt(process.env.PORT) || 5000;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled rejections — log and exit
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  shutdown('UNHANDLED_REJECTION');
});

server.listen(PORT, async () => {
  try {
    await prisma.$connect();
    logger.info(`Database connected`);
    logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  } catch (err) {
    logger.error('Failed to connect to database:', err);
    process.exit(1);
  }
});
