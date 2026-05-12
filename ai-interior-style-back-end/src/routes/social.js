import express from 'express';
import { Follow } from '../models/Follow.js';
import { Like } from '../models/Like.js';
import { Save } from '../models/Save.js';
import { Share } from '../models/Share.js';
import { User } from '../models/User.js';
import { PortfolioItem } from '../models/PortfolioItem.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendNotification } from '../services/notificationService.js';

const router = express.Router();

// Use sendNotification directly from the notification service

// ===== FOLLOW SYSTEM =====

// Follow a designer
router.post('/follow/:userId', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.userId;
    const followingId = req.params.userId;
    
    // Can't follow yourself
    if (followerId === followingId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if user exists and is a designer
    const designer = await User.findById(followingId);
    if (!designer || designer.role !== 'designer') {
      return res.status(404).json({ error: 'Designer not found' });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({ followerId, followingId });
    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this designer' });
    }

    // Create follow relationship
    const follow = new Follow({ followerId, followingId });
    await follow.save();

    // Send notification to designer
    await sendNotification(followingId, {
      title: 'New Follower',
      message: 'Someone started following you!',
      type: 'new_follower'
    });

    res.status(201).json({ message: 'Successfully followed designer' });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unfollow a designer
router.delete('/follow/:userId', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.userId;
    const followingId = req.params.userId;

    const result = await Follow.findOneAndDelete({ followerId, followingId });
    if (!result) {
      return res.status(404).json({ error: 'Not following this designer' });
    }

    res.json({ message: 'Successfully unfollowed designer' });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get followers of a user
router.get('/followers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const follows = await Follow.find({ followingId: userId })
      .populate('followerId', 'email profile profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const followers = follows.map(follow => follow.followerId);
    const total = await Follow.countDocuments({ followingId: userId });

    res.json({
      followers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users that a user is following
router.get('/following/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const follows = await Follow.find({ followerId: userId })
      .populate('followingId', 'email profile profilePicture is_verified role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const following = follows.map(follow => follow.followingId);
    const total = await Follow.countDocuments({ followerId: userId });

    res.json({
      following,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if following a user
router.get('/follow-status/:userId', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.userId;
    const followingId = req.params.userId;

    const follow = await Follow.findOne({ followerId, followingId });
    res.json({ isFollowing: !!follow });
  } catch (error) {
    console.error('Follow status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== LIKE SYSTEM =====

// Like content
router.post('/like/:targetType/:targetId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetType, targetId } = req.params;
    
    // Validate target type
    if (!['portfolio', 'design'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    // Check if content exists
    let content;
    if (targetType === 'portfolio') {
      content = await PortfolioItem.findById(targetId);
    } else {
      // Design items would be in a separate model (to be implemented)
      return res.status(501).json({ error: 'Design likes not yet implemented' });
    }

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if already liked
    const existingLike = await Like.findOne({ userId, targetType, targetId });
    if (existingLike) {
      return res.status(400).json({ error: 'Already liked' });
    }

    // Create like
    const like = new Like({ userId, targetType, targetId });
    await like.save();

    // Send notification to content owner (if not own content)
    // TODO: Fix notification service - temporarily disabled
    // if (content.designerId.toString() !== userId) {
    //   await sendNotification(content.designerId, {
    //     title: 'New Like',
    //     message: 'Someone liked your portfolio item!',
    //     type: 'new_like'
    //   });
    // }

    res.status(201).json({ message: 'Successfully liked content' });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unlike content
router.delete('/like/:targetType/:targetId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetType, targetId } = req.params;

    const result = await Like.findOneAndDelete({ userId, targetType, targetId });
    if (!result) {
      return res.status(404).json({ error: 'Like not found' });
    }

    res.json({ message: 'Successfully unliked content' });
  } catch (error) {
    console.error('Unlike error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get likes for content
router.get('/likes/:targetType/:targetId', async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const likes = await Like.find({ targetType, targetId })
      .populate('userId', 'email profile profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const users = likes.map(like => like.userId);
    const total = await Like.countDocuments({ targetType, targetId });

    res.json({
      likes: users,
      count: total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get likes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user liked content
router.get('/like-status/:targetType/:targetId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetType, targetId } = req.params;

    const like = await Like.findOne({ userId, targetType, targetId });
    res.json({ isLiked: !!like });
  } catch (error) {
    console.error('Like status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== SAVE SYSTEM =====

// Save content
router.post('/save/:targetType/:targetId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetType, targetId } = req.params;
    
    // Validate target type
    if (!['design', 'portfolio'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    // Check if content exists
    let content;
    if (targetType === 'portfolio') {
      content = await PortfolioItem.findById(targetId);
    } else {
      return res.status(501).json({ error: 'Design saves not yet implemented' });
    }

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if already saved
    const existingSave = await Save.findOne({ userId, targetType, targetId });
    if (existingSave) {
      return res.status(400).json({ error: 'Already saved' });
    }

    // Create save
    const save = new Save({ userId, targetType, targetId });
    await save.save();

    res.status(201).json({ message: 'Successfully saved content' });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unsave content
router.delete('/save/:targetType/:targetId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetType, targetId } = req.params;

    const result = await Save.findOneAndDelete({ userId, targetType, targetId });
    if (!result) {
      return res.status(404).json({ error: 'Save not found' });
    }

    res.json({ message: 'Successfully unsaved content' });
  } catch (error) {
    console.error('Unsave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's saved content
router.get('/saved', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetType, page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = { userId };
    if (targetType) {
      query.targetType = targetType;
    }

    const saves = await Save.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Populate content details
    const contentPromises = saves.map(async (save) => {
      if (save.targetType === 'portfolio') {
        return await PortfolioItem.findById(save.targetId);
      }
      return null;
    });

    const content = await Promise.all(contentPromises);
    const total = await Save.countDocuments(query);

    res.json({
      saved: content.filter(item => item !== null),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get saved error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user saved content
router.get('/save-status/:targetType/:targetId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetType, targetId } = req.params;

    const save = await Save.findOne({ userId, targetType, targetId });
    res.json({ isSaved: !!save });
  } catch (error) {
    console.error('Save status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== SHARE SYSTEM =====

// Share content
router.post('/share/:targetType/:targetId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetType, targetId } = req.params;
    const { shareMethod = 'link', platform = 'other' } = req.body;
    
    // Validate target type
    if (!['design', 'portfolio'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    // Check if content exists
    let content;
    if (targetType === 'portfolio') {
      content = await PortfolioItem.findById(targetId);
    } else {
      return res.status(501).json({ error: 'Design shares not yet implemented' });
    }

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Create share record
    const share = new Share({ 
      userId, 
      targetType, 
      targetId, 
      shareMethod, 
      platform 
    });
    await share.save();

    res.status(201).json({ 
      message: 'Content shared successfully',
      shareId: share._id
    });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get share statistics for content
router.get('/shares/:targetType/:targetId', async (req, res) => {
  try {
    const { targetType, targetId } = req.params;

    const shares = await Share.find({ targetType, targetId });
    
    const stats = {
      totalShares: shares.length,
      byMethod: {
        link: shares.filter(s => s.shareMethod === 'link').length,
        social: shares.filter(s => s.shareMethod === 'social').length,
        email: shares.filter(s => s.shareMethod === 'email').length
      },
      byPlatform: {}
    };

    // Count by platform
    shares.forEach(share => {
      stats.byPlatform[share.platform] = (stats.byPlatform[share.platform] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    console.error('Get shares error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
