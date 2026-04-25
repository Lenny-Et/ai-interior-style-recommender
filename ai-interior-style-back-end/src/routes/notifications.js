import express from 'express';
import { Notification } from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      page = 1, 
      limit = 20, 
      type, 
      isRead,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = { userId };

    if (type) {
      query.type = type;
    }

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const notifications = await Notification.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    res.json({
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark multiple notifications as read
router.put('/mark-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationIds } = req.body;

    let query = { userId };
    if (notificationIds && notificationIds.length > 0) {
      query._id = { $in: notificationIds };
    }

    const result = await Notification.updateMany(
      query,
      { isRead: true }
    );

    res.json({
      message: 'Notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete multiple notifications
router.delete('/batch', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationIds } = req.body;

    if (!notificationIds || notificationIds.length === 0) {
      return res.status(400).json({ error: 'Notification IDs are required' });
    }

    const result = await Notification.deleteMany({
      _id: { $in: notificationIds },
      userId
    });

    res.json({
      message: 'Notifications deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Batch delete notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // This would come from a UserNotificationPreferences model
    // For now, return default preferences
    const preferences = {
      email: {
        newFollowers: true,
        likes: true,
        comments: true,
        aiRecommendations: true,
        paymentConfirmations: true,
        systemUpdates: false
      },
      push: {
        newFollowers: true,
        likes: false,
        comments: true,
        aiRecommendations: true,
        paymentConfirmations: true,
        systemUpdates: false
      },
      inApp: {
        newFollowers: true,
        likes: true,
        comments: true,
        aiRecommendations: true,
        paymentConfirmations: true,
        systemUpdates: true
      }
    };

    res.json({ preferences });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update notification preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { preferences } = req.body;

    // This would save to a UserNotificationPreferences model
    // For now, just return success
    console.log(`Updated notification preferences for user ${userId}:`, preferences);

    res.json({
      message: 'Notification preferences updated successfully',
      preferences
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { period = '30d' } = req.query;

    // Calculate date range
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalCount,
      unreadCount,
      periodCount,
      typeStats
    ] = await Promise.all([
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, isRead: false }),
      Notification.countDocuments({ userId, createdAt: { $gte: startDate } }),
      Notification.aggregate([
        { $match: { userId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Format type stats
    const formattedTypeStats = {};
    typeStats.forEach(stat => {
      formattedTypeStats[stat._id] = stat.count;
    });

    res.json({
      period,
      stats: {
        total: totalCount,
        unread: unreadCount,
        period: periodCount,
        byType: formattedTypeStats
      }
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
