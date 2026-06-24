const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Each user joins their own private room
    socket.join(`user:${socket.userId}`);

    // Admins also join the admin broadcast room
    if (socket.userRole === 'ADMIN') {
      socket.join('admin');
    }

    logger.debug(`Socket connected: userId=${socket.userId}`);

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: userId=${socket.userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// Emit to a specific user's room
const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

// Emit to admin room
const emitToAdmin = (event, data) => {
  if (io) io.to('admin').emit(event, data);
};

module.exports = { initSocket, getIO, emitToUser, emitToAdmin };
