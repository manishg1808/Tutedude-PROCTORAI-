const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const { syncDatabase } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const interviewRoutes = require('./routes/interviews');
const logRoutes = require('./routes/logs');
const reportRoutes = require('./routes/reports');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Video Proctoring System API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/reports', reportRoutes);

// Socket.IO for real-time communication
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join interview room
  socket.on('join-interview', (interviewId) => {
    socket.join(`interview-${interviewId}`);
    console.log(`Client ${socket.id} joined interview ${interviewId}`);
  });

  // Leave interview room
  socket.on('leave-interview', (interviewId) => {
    socket.leave(`interview-${interviewId}`);
    console.log(`Client ${socket.id} left interview ${interviewId}`);
  });

  // Handle real-time event logging
  socket.on('log-event', (data) => {
    // Broadcast to all clients in the interview room
    socket.to(`interview-${data.interviewId}`).emit('new-event', data);
  });

  // Handle focus detection updates
  socket.on('focus-update', (data) => {
    socket.to(`interview-${data.interviewId}`).emit('focus-status', data);
  });

  // Handle object detection alerts
  socket.on('object-detected', (data) => {
    socket.to(`interview-${data.interviewId}`).emit('suspicious-activity', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Initialize database and start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Sync database
    await syncDatabase();
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

startServer();

module.exports = { app, io };
