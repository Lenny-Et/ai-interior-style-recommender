import express from 'express';
import { FeedItem } from '../models/Feed.js';
import { Follow } from '../models/Follow.js';
import { PortfolioItem } from '../models/PortfolioItem.js';
import { User } from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Feed generation service
class FeedService {
  static async generateFeedForUser(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    try {
      // 1. Get users that this user follows
      const following = await Follow.find({ followerId: userId }).select('followingId');
      const followingIds = following.map(f => f.followingId);

      // 2. Get content from followed designers (or all content if no follows)
      let followedContent = [];
      if (followingIds.length > 0) {
        followedContent = await PortfolioItem.find({
          designerId: { $in: followingIds },
          isApproved: true
        })
        .populate('designerId', 'profile profilePicture is_verified')
        .sort({ createdAt: -1 })
        .limit(limitNum);
      } else {
        // If user doesn't follow anyone, get recent content as fallback
        followedContent = await PortfolioItem.find({ isApproved: true })
        .populate('designerId', 'profile profilePicture is_verified')
        .sort({ createdAt: -1 })
        .limit(Math.floor(limitNum / 2));
      }

      // 3. Get trending content (high engagement)
      // Simplified trending - just get recent content since likes collection doesn't exist yet
      const trendingContent = await PortfolioItem.find({
        isApproved: true,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      })
      .populate('designerId', 'profile profilePicture is_verified')
      .sort({ createdAt: -1 })
      .limit(10);

      // 4. Get recommended content (based on user preferences)
      const user = await User.findById(userId);
      const recommendedContent = await this.getRecommendedContent(user, 5);

      // 5. Combine and score content
      const allContent = [
        ...followedContent.map(item => ({
          ...item.toObject(),
          relevanceScore: 8.0,
          interactionType: 'liked_by_following'
        })),
        ...trendingContent.map(item => ({
          ...item,
          relevanceScore: 7.0 + (item.likeCount * 0.1),
          interactionType: 'trending'
        })),
        ...recommendedContent.map(item => ({
          ...item,
          relevanceScore: 6.0,
          interactionType: 'recommended'
        }))
      ];

      // 6. Remove duplicates and sort by relevance
      const uniqueContent = allContent.filter((item, index, self) =>
        index === self.findIndex(t => t._id.toString() === item._id.toString())
      );

      uniqueContent.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // 7. Paginate
      const paginatedContent = uniqueContent.slice(skip, skip + limitNum);

      // 8. Store in feed items for caching
      await this.cacheFeedItems(userId, paginatedContent);

      return {
        feed: paginatedContent,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: uniqueContent.length,
          pages: Math.ceil(uniqueContent.length / limitNum)
        }
      };
    } catch (error) {
      console.error('Feed generation error:', error);
      throw error;
    }
  }

  static async getRecommendedContent(user, limit = 5) {
    // Simple recommendation based on user's profile preferences
    // In a real implementation, this would use more sophisticated algorithms
    const preferredStyles = user.profile?.preferredStyles || [];
    const preferredRooms = user.profile?.preferredRooms || [];

    let query = {};
    if (preferredStyles.length > 0) {
      query['metadata.style'] = { $in: preferredStyles };
    }
    if (preferredRooms.length > 0) {
      query['metadata.roomType'] = { $in: preferredRooms };
    }

    query.isApproved = true;

    return await PortfolioItem.find(query)
      .populate('designerId', 'profile profilePicture is_verified')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  static async cacheFeedItems(userId, content) {
    const feedItems = content.map(item => ({
      userId,
      content: {
        type: 'portfolio',
        targetId: item._id,
        relevanceScore: item.relevanceScore || 1.0,
        metadata: {
          designerId: item.designerId,
          style: item.metadata?.style,
          roomType: item.metadata?.roomType,
          description: item.description,
          imageUrl: item.imageUrl
        }
      },
      interactionType: item.interactionType || 'new'
    }));

    // Clear old feed items for this user
    await FeedItem.deleteMany({ userId });

    // Insert new feed items
    await FeedItem.insertMany(feedItems);
  }

  static async addContentToFollowersFeed(content) {
    // Add new content to all followers' feeds
    const followers = await Follow.find({ followingId: content.designerId });
    
    const feedItems = followers.map(follow => ({
      userId: follow.followerId,
      content: {
        type: 'portfolio',
        targetId: content._id,
        relevanceScore: 8.0,
        metadata: {
          designerId: content.designerId,
          style: content.metadata?.style,
          roomType: content.metadata?.roomType,
          description: content.description,
          imageUrl: content.imageUrl
        }
      },
      interactionType: 'liked_by_following'
    }));

    await FeedItem.insertMany(feedItems);
  }
}

// Get personalized feed for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, followingOnly = 'false', likesOnly = 'false' } = req.query;
    
    const { Like } = await import('../models/Like.js');
    const { Comment } = await import('../models/Comment.js');
    const { Save } = await import('../models/Save.js');

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build the query
    let query = { isApproved: true };

    if (followingOnly === 'true') {
      const following = await Follow.find({ followerId: userId }).select('followingId');
      const followingIds = following.map(f => f.followingId);
      query.designerId = { $in: followingIds };
    }

    if (likesOnly === 'true') {
      const userLikes = await Like.find({ 
        userId, 
        targetType: 'portfolio' 
      }).select('targetId');
      const likedItemIds = userLikes.map(l => l.targetId);
      query._id = { $in: likedItemIds };
    }

    // Fetch portfolio items
    const portfolioItems = await PortfolioItem.find(query)
      .populate('designerId', 'profile is_verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await PortfolioItem.countDocuments(query);

    // Get like data for all portfolio items to show like status in UI
    const portfolioItemIds = portfolioItems.map(item => item._id);
    
    // Get all likes for these portfolio items
    const likes = await Like.find({
      targetType: 'portfolio',
      targetId: { $in: portfolioItemIds }
    });

    // Get follow status for designers in the feed
    const designerIds = portfolioItems.map(item => item.designerId?._id || item.designerId).filter(id => id);
    const follows = await Follow.find({
      followerId: userId,
      followingId: { $in: designerIds }
    });
    
    // Create sets for fast lookup
    const followedDesignerIds = new Set(follows.map(f => f.followingId.toString()));
    
    // Count likes per item and check if current user liked each
    const likeCounts = {};
    const currentUserLikes = new Set();
    
    likes.forEach(like => {
      likeCounts[like.targetId] = (likeCounts[like.targetId] || 0) + 1;
      if (like.userId.toString() === userId) {
        currentUserLikes.add(like.targetId.toString());
      }
    });

    // Get all comments for these portfolio items to count them
    const comments = await Comment.find({
      targetType: 'portfolio',
      targetId: { $in: portfolioItemIds }
    });

    const commentCounts = {};
    comments.forEach(comment => {
      commentCounts[comment.targetId] = (commentCounts[comment.targetId] || 0) + 1;
    });

    // Check which items are saved by the current user
    const saves = await Save.find({
      userId,
      targetType: 'portfolio',
      targetId: { $in: portfolioItemIds }
    });

    const userSaves = new Set(saves.map(s => s.targetId.toString()));

    // Transform to match frontend expected format
    const feed = portfolioItems.map(item => {
      const itemId = item._id.toString();
      const designerId = (item.designerId?._id || item.designerId).toString();
      
      // Sanitize image URL to handle problematic characters
      let sanitizedImageUrl = item.imageUrl;
      if (sanitizedImageUrl) {
        try {
          // If new URL succeeds, the URL is already valid. No need to double-encode it.
          new URL(sanitizedImageUrl);
        } catch (urlError) {
          sanitizedImageUrl = sanitizedImageUrl.replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]/g, encodeURIComponent);
        }
      }
      
      return {
        id: itemId,
        imageUrl: sanitizedImageUrl,
        description: item.description,
        metadata: {
          style: item.metadata?.style || 'Modern',
          roomType: item.metadata?.roomType || 'Living Room'
        },
        designerId: {
          _id: designerId,
          profile: {
            firstName: item.designerId?.profile?.firstName || 'Designer',
            lastName: item.designerId?.profile?.lastName || '',
            profilePicture: item.designerId?.profile?.profilePicture
          },
          isFollowing: followedDesignerIds.has(designerId)
        },
        likeCount: likeCounts[itemId] || 0,
        commentCount: commentCounts[itemId] || 0,
        isLiked: currentUserLikes.has(itemId),
        isSaved: userSaves.has(itemId),
        createdAt: item.createdAt
      };
    });

    res.json({
      feed,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get feed error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Check if this is the "url parameter not allowed" error
    if (error.message && error.message.includes('url') && error.message.includes('parameter')) {
      console.error('URL parameter error detected - likely image URL validation issue');
      res.status(400).json({ 
        error: 'Image URL validation error', 
        details: 'Some image URLs contain invalid parameters',
        message: error.message 
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Refresh feed for user
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.body;
    
    const feed = await FeedService.generateFeedForUser(userId, { page, limit });
    res.json(feed);
  } catch (error) {
    console.error('Refresh feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trending content
router.get('/trending', async (req, res) => {
  try {
    const { page = 1, limit = 10, timeRange = '7d' } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Calculate date range
    const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Simplified trending - just get recent content since likes/shares collections don't exist yet
    const trendingContent = await PortfolioItem.find({
      createdAt: { $gte: startDate }
    })
    .populate('designerId', 'profile profilePicture is_verified')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

    const total = await PortfolioItem.countDocuments({
      createdAt: { $gte: startDate }
    });

    res.json({
      trending: trendingContent,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get trending error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recommendations for user
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 10 } = req.query;
    
    const user = await User.findById(userId);
    const recommendations = await FeedService.getRecommendedContent(user, parseInt(limit));

    res.json({
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add content to followers' feeds (called when new portfolio item is created)
router.post('/add-to-followers-feed', authenticateToken, async (req, res) => {
  try {
    const { contentId } = req.body;
    const userId = req.user.userId;

    // Verify user owns this content
    const content = await PortfolioItem.findOne({ _id: contentId, designerId: userId });
    if (!content) {
      return res.status(404).json({ error: 'Content not found or access denied' });
    }

    await FeedService.addContentToFollowersFeed(content);

    res.json({ message: 'Content added to followers\' feeds' });
  } catch (error) {
    console.error('Add to followers feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear user's feed cache
router.delete('/clear-cache', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await FeedItem.deleteMany({ userId });
    
    res.json({ message: 'Feed cache cleared' });
  } catch (error) {
    console.error('Clear feed cache error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
