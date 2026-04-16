import { Notification } from '../models/Notification.js';

let io;

export const initNotificationService = (socketIoInstance) => {
  io = socketIoInstance;
};

export const sendNotification = async (userId, title, message, type = 'system') => {
  try {
    // 1. Persist to Database
    const notification = new Notification({
      userId,
      title,
      message,
      type
    });
    await notification.save();

    // 2. Real-time Dispatch via Socket.io
    if (io) {
      io.to(userId.toString()).emit('new_notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};
