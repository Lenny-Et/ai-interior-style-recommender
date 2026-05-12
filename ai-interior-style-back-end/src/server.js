import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import authRoutes from './routes/auth.js';
import portfolioRoutes from './routes/portfolio.js';
import profileRoutes from './routes/profiles.js';
import socialRoutes from './routes/social.js';
import feedRoutes from './routes/feed.js';
import searchRoutes from './routes/search.js';
import uploadRoutes from './routes/upload.js';
import boardsRoutes from './routes/boards.js';
import customRequestsRoutes from './routes/customRequests.js';
import designerAnalyticsRoutes from './routes/designerAnalytics.js';
import adminAnalyticsRoutes from './routes/adminAnalytics.js';
import adminRoutes from './routes/admin.js';
import aiRoutes from './routes/ai.js';
import notificationRoutes from './routes/notifications.js';
import supportRoutes from './routes/support.js';
import paymentRoutes from './routes/payment.js';
import userDesignsRoutes from './routes/userDesigns.js';
import { initNotificationService } from './services/notificationService.js';
import { startExpirationWorker } from './workers/expirationWorker.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

// Request logging: console + file
const logsDir = path.join(process.cwd(), 'logs');

// Simple environment test
console.log('=== ENVIRONMENT TEST ===');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('CHAPA_SECRET_KEY exists:', !!process.env.CHAPA_SECRET_KEY);
console.log('CHAPA_WEBHOOK_SECRET exists:', !!process.env.CHAPA_WEBHOOK_SECRET);
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('=== END ENVIRONMENT TEST ===');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}
const accessLogStream = fs.createWriteStream(path.join(logsDir, 'requests.log'), { flags: 'a' });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));
app.use(morgan('combined', { stream: accessLogStream }));

// Add multipart form data middleware for file uploads
import multer from 'multer';
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Serve static files from uploads directory (for local storage fallback)
app.use('/uploads', express.static('uploads'));

// Enable mongoose query logging for debugging
mongoose.set('debug', true);

// Initialize Services
initNotificationService(io);
startExpirationWorker();

io.on('connection', (socket) => {
  const { userId } = socket.handshake.query;
  if (userId) {
    socket.join(userId);
    console.log(`User ${userId} joined their notification room`);
  }
});

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('MongoDB connection error:', error));
} else {
  console.log('Skipping MongoDB connection: MONGODB_URI not provided.');
}

app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/boards', boardsRoutes);
app.use('/api/custom-requests', customRequestsRoutes);
app.use('/api/designer/analytics', designerAnalyticsRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/user-designs', userDesignsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Auth service running' });
});

// Express error handler (prints full stack)
app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  const status = err && err.status ? err.status : 500;
  const payload = { error: err && err.message ? err.message : 'Internal server error' };
  if (process.env.NODE_ENV !== 'production' && err && err.stack) {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
});

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep server running
});

const PORT = process.env.PORT || 5000;

const server = httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port or kill the process using port ${PORT}.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

