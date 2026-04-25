import { Notification } from '../models/Notification.js';

let io;

export const initNotificationService = (socketIoInstance) => {
  io = socketIoInstance;
  return {
    sendNotification,
    sendBulkNotifications,
    markNotificationRead,
    getUserNotifications,
    getUnreadCount
  };
};

export const sendNotification = async (userId, notificationData) => {
  try {
    const { title, message, type = 'system', metadata = {} } = notificationData;
    
    // Check user preferences before sending
    const shouldSend = await checkNotificationPreferences(userId, type);
    if (!shouldSend) {
      console.log(`Notification type ${type} disabled for user ${userId}`);
      return null;
    }

    // 1. Persist to Database
    const notification = new Notification({
      userId,
      title,
      message,
      type,
      metadata
    });
    await notification.save();

    // 2. Real-time Dispatch via Socket.io
    if (io) {
      const notificationPayload = {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        metadata: notification.metadata
      };

      io.to(userId.toString()).emit('new_notification', notificationPayload);
      
      // Update unread count
      const unreadCount = await Notification.countDocuments({ userId, isRead: false });
      io.to(userId.toString()).emit('unread_count_updated', { count: unreadCount });
    }

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

export const sendBulkNotifications = async (userIds, notificationData) => {
  try {
    const results = await Promise.allSettled(
      userIds.map(userId => sendNotification(userId, notificationData))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Bulk notification sent: ${successful} successful, ${failed} failed`);
    
    return { successful, failed };
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    throw error;
  }
};

export const markNotificationRead = async (userId, notificationId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );

    if (notification && io) {
      io.to(userId.toString()).emit('notification_read', {
        notificationId: notification._id,
        isRead: notification.isRead
      });

      // Update unread count
      const unreadCount = await Notification.countDocuments({ userId, isRead: false });
      io.to(userId.toString()).emit('unread_count_updated', { count: unreadCount });
    }

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const getUserNotifications = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      isRead,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = { userId };
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const notifications = await Notification.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return {
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      unreadCount
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

export const getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({ userId, isRead: false });
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

// Helper function to check user notification preferences
async function checkNotificationPreferences(userId, notificationType) {
  try {
    // This would check against a UserNotificationPreferences model
    // For now, allow all notifications
    return true;
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    return true; // Default to allowing notifications
  }
}

// Notification templates for common events
export const NotificationTemplates = {
  NEW_FOLLOWER: (followerName) => ({
    title: 'New Follower',
    message: `${followerName} started following you!`,
    type: 'new_follower'
  }),
  
  NEW_LIKE: (likerName, contentType) => ({
    title: 'New Like',
    message: `${likerName} liked your ${contentType}!`,
    type: 'new_like'
  }),
  
  NEW_COMMENT: (commenterName, contentType) => ({
    title: 'New Comment',
    message: `${commenterName} commented on your ${contentType}!`,
    type: 'new_comment'
  }),
  
  AI_RECOMMENDATIONS_READY: () => ({
    title: 'AI Recommendations Ready',
    message: 'Your personalized design recommendations are ready to view!',
    type: 'ai_ready'
  }),
  
  PAYMENT_CONFIRMED: (amount) => ({
    title: 'Payment Confirmed',
    message: `Your payment of ${amount} has been confirmed!`,
    type: 'payment_confirmed'
  }),
  
  PROJECT_COMPLETED: (designerName) => ({
    title: 'Project Completed',
    message: `${designerName} marked your project as completed!`,
    type: 'project_completed'
  }),
  
  SYSTEM_UPDATE: (message) => ({
    title: 'System Update',
    message,
    type: 'system'
  })
};
