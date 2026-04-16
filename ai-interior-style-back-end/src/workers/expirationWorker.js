import cron from 'node-cron';
import { Notification } from '../models/Notification.js';

export const startExpirationWorker = () => {
  // Run every 24 hours at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running Notification Expiration Worker...');
    
    try {
      const now = new Date();
      
      // Delete Read notifications older than 30 days
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const readDeleted = await Notification.deleteMany({
        isRead: true,
        updatedAt: { $lt: thirtyDaysAgo }
      });
      
      // Delete Unread notifications older than 60 days
      const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
      const unreadDeleted = await Notification.deleteMany({
        isRead: false,
        createdAt: { $lt: sixtyDaysAgo }
      });

      console.log(`Cleanup Complete: Removed ${readDeleted.deletedCount} read and ${unreadDeleted.deletedCount} unread notifications.`);
    } catch (error) {
      console.error('Error in Notification Expiration Worker:', error);
    }
  });
};
