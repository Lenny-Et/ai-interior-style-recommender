import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import portfolioRoutes from './routes/portfolio.js';
import { initNotificationService } from './services/notificationService.js';
import { startExpirationWorker } from './workers/expirationWorker.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

app.use(cors());
app.use(express.json());

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Auth service running' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

