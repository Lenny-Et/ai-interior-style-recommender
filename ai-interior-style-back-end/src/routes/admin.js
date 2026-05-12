import express from 'express';
import { User } from '../models/User.js';
import { PortfolioItem } from '../models/PortfolioItem.js';
import { Transaction } from '../models/Transaction.js';
import { Like } from '../models/Like.js';
import { Follow } from '../models/Follow.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticateToken);
router.use(requireRole('admin'));

// ===== USER MANAGEMENT =====

// Get all users with pagination and filtering
router.get('/users', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      verified,
      status, // active, blocked, pending
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = {};

    if (role) {
      query.role = role;
    }

    if (verified !== undefined) {
      query.is_verified = verified === 'true';
    }

    if (status) {
      switch (status) {
        case 'blocked':
          query.isBlocked = true;
          break;
        case 'active':
          query.isBlocked = { $ne: true };
          break;
        case 'pending':
          query.is_verified = false;
          query.role = 'designer';
          break;
      }
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { 'profile.company': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get users with stats
    const users = await User.find(query)
      .select('-passwordHash')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Add stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const [portfolioCount, followerCount, transactionCount] = await Promise.all([
          PortfolioItem.countDocuments({ designerId: user._id }),
          Follow.countDocuments({ followingId: user._id }),
          Transaction.countDocuments({ 
            $or: [{ homeownerId: user._id }, { designerId: user._id }] 
          })
        ]);

        return {
          ...user.toObject(),
          stats: {
            portfolioCount,
            followerCount,
            transactionCount
          }
        };
      })
    );

    const total = await User.countDocuments(query);

    res.json({
      users: usersWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single user details
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get detailed stats
    const [portfolioItems, followers, following, transactions] = await Promise.all([
      PortfolioItem.find({ designerId: id }).sort({ createdAt: -1 }),
      Follow.find({ followingId: id }).populate('followerId', 'profile profilePicture'),
      Follow.find({ followerId: id }).populate('followingId', 'profile profilePicture'),
      Transaction.find({
        $or: [{ homeownerId: id }, { designerId: id }]
      }).sort({ createdAt: -1 })
    ]);

    res.json({
      user,
      portfolio: portfolioItems,
      followers,
      following,
      transactions,
      stats: {
        portfolioCount: portfolioItems.length,
        followerCount: followers.length,
        followingCount: following.length,
        transactionCount: transactions.length
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update allowed fields
    const allowedFields = ['role', 'is_verified', 'isBlocked', 'profile'];
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        user[key] = updates[key];
      }
    });

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Block/Unblock user
router.post('/users/:id/block', async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked, reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBlocked = blocked;
    if (reason) {
      user.blockReason = reason;
    }

    await user.save();

    res.json({
      message: blocked ? 'User blocked successfully' : 'User unblocked successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete related data
    await Promise.all([
      PortfolioItem.deleteMany({ designerId: id }),
      Follow.deleteMany({ $or: [{ followerId: id }, { followingId: id }] }),
      Like.deleteMany({ userId: id }),
      Transaction.deleteMany({ $or: [{ homeownerId: id }, { designerId: id }] })
    ]);

    await User.findByIdAndDelete(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== CONTENT MODERATION =====

// Get pending content for review
router.get('/content/pending', async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = { isApproved: false };

    if (type === 'portfolio') {
      const portfolioItems = await PortfolioItem.find(query)
        .populate('designerId', 'profile profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      const total = await PortfolioItem.countDocuments(query);

      return res.json({
        content: portfolioItems,
        contentType: 'portfolio',
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
    }

    // Add other content types as needed
    res.json({ content: [], contentType: type || 'all' });
  } catch (error) {
    console.error('Get pending content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve content
router.post('/content/:type/:id/approve', async (req, res) => {
  try {
    const { type, id } = req.params;

    if (type === 'portfolio') {
      const portfolioItem = await PortfolioItem.findByIdAndUpdate(
        id,
        { isApproved: true, approvedAt: new Date() },
        { new: true }
      );

      if (!portfolioItem) {
        return res.status(404).json({ error: 'Portfolio item not found' });
      }

      return res.json({
        message: 'Content approved successfully',
        content: portfolioItem
      });
    }

    res.status(400).json({ error: 'Invalid content type' });
  } catch (error) {
    console.error('Approve content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove content
router.delete('/content/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { reason } = req.body;

    if (type === 'portfolio') {
      const portfolioItem = await PortfolioItem.findByIdAndDelete(id);
      if (!portfolioItem) {
        return res.status(404).json({ error: 'Portfolio item not found' });
      }

      return res.json({
        message: 'Content removed successfully',
        removedContent: portfolioItem
      });
    }

    res.status(400).json({ error: 'Invalid content type' });
  } catch (error) {
    console.error('Remove content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject content
router.post('/content/:type/:id/reject', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { reason } = req.body;

    if (type === 'portfolio') {
      const portfolioItem = await PortfolioItem.findByIdAndUpdate(
        id,
        { 
          isApproved: false, 
          rejectedAt: new Date(),
          rejectionReason: reason || 'Content does not meet quality standards'
        },
        { new: true }
      );

      if (!portfolioItem) {
        return res.status(404).json({ error: 'Portfolio item not found' });
      }

      return res.json({
        message: 'Content rejected successfully',
        content: portfolioItem
      });
    }

    res.status(400).json({ error: 'Invalid content type' });
  } catch (error) {
    console.error('Reject content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request edit for content
router.post('/content/:type/:id/request-edit', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { note } = req.body;

    if (type === 'portfolio') {
      const portfolioItem = await PortfolioItem.findByIdAndUpdate(
        id,
        { 
          isApproved: false, 
          editRequestedAt: new Date(),
          editRequestNote: note || 'Please review and update this content'
        },
        { new: true }
      );

      if (!portfolioItem) {
        return res.status(404).json({ error: 'Portfolio item not found' });
      }

      return res.json({
        message: 'Edit request sent successfully',
        content: portfolioItem
      });
    }

    res.status(400).json({ error: 'Invalid content type' });
  } catch (error) {
    console.error('Request edit content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== ANALYTICS & REPORTING =====

// Get usage statistics
router.get('/analytics/usage', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;
    else if (period === '1y') days = 365;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers,
      totalDesigners,
      newDesigners,
      totalPortfolioItems,
      newPortfolioItems,
      totalTransactions,
      newTransactions
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startDate } }),
      User.countDocuments({ role: 'designer' }),
      User.countDocuments({ role: 'designer', createdAt: { $gte: startDate } }),
      PortfolioItem.countDocuments(),
      PortfolioItem.countDocuments({ createdAt: { $gte: startDate } }),
      Transaction.countDocuments(),
      Transaction.countDocuments({ createdAt: { $gte: startDate } })
    ]);

    // Daily registration stats
    const dailyRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      period,
      users: {
        total: totalUsers,
        new: newUsers,
        growthRate: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(2) : 0
      },
      designers: {
        total: totalDesigners,
        new: newDesigners,
        growthRate: totalDesigners > 0 ? ((newDesigners / totalDesigners) * 100).toFixed(2) : 0
      },
      content: {
        portfolioItems: {
          total: totalPortfolioItems,
          new: newPortfolioItems
        }
      },
      transactions: {
        total: totalTransactions,
        new: newTransactions
      },
      dailyRegistrations
    });
  } catch (error) {
    console.error('Usage analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get engagement metrics
router.get('/analytics/engagement', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalLikes,
      newLikes,
      totalFollows,
      newFollows,
      totalShares,
      newShares,
      topDesigners,
      topPortfolioItems
    ] = await Promise.all([
      Like.countDocuments(),
      Like.countDocuments({ createdAt: { $gte: startDate } }),
      Follow.countDocuments(),
      Follow.countDocuments({ createdAt: { $gte: startDate } }),
      // Shares would be from Share model when implemented
      0,
      0,
      User.aggregate([
        { $match: { role: 'designer' } },
        {
          $lookup: {
            from: 'follows',
            localField: '_id',
            foreignField: 'followingId',
            as: 'followers'
          }
        },
        {
          $addFields: {
            followerCount: { $size: '$followers' }
          }
        },
        { $sort: { followerCount: -1 } },
        { $limit: 10 },
        { $project: { passwordHash: 0 } }
      ]),
      PortfolioItem.aggregate([
        {
          $lookup: {
            from: 'likes',
            localField: '_id',
            foreignField: 'targetId',
            as: 'likes'
          }
        },
        {
          $addFields: {
            likeCount: { $size: '$likes' }
          }
        },
        { $sort: { likeCount: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Daily engagement stats
    const dailyEngagement = await Promise.all([
      Like.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            likes: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Follow.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            follows: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      period,
      engagement: {
        likes: {
          total: totalLikes,
          new: newLikes
        },
        follows: {
          total: totalFollows,
          new: newFollows
        },
        shares: {
          total: totalShares,
          new: newShares
        }
      },
      topDesigners,
      topPortfolioItems,
      dailyEngagement: {
        likes: dailyEngagement[0],
        follows: dailyEngagement[1]
      }
    });
  } catch (error) {
    console.error('Engagement analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get revenue analytics
router.get('/analytics/revenue', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalRevenue,
      periodRevenue,
      totalTransactions,
      periodTransactions,
      commissionRevenue,
      designerPayouts,
      revenueByPeriod
    ] = await Promise.all([
      Transaction.aggregate([
        { $match: { status: 'released_to_designer' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { 
          $match: { 
            status: 'released_to_designer',
            createdAt: { $gte: startDate }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.countDocuments({ status: 'released_to_designer' }),
      Transaction.countDocuments({
        status: 'released_to_designer',
        createdAt: { $gte: startDate }
      }),
      Transaction.aggregate([
        { $match: { status: 'released_to_designer' } },
        { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
      ]),
      Transaction.aggregate([
        { $match: { status: 'released_to_designer' } },
        { $group: { _id: null, total: { $sum: '$designerPayout' } } }
      ]),
      Transaction.aggregate([
        { $match: { status: 'released_to_designer' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            revenue: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      period,
      revenue: {
        total: totalRevenue[0]?.total || 0,
        periodRevenue: periodRevenue[0]?.total || 0,
        commission: commissionRevenue[0]?.total || 0,
        designerPayouts: designerPayouts[0]?.total || 0
      },
      transactions: {
        total: totalTransactions,
        period: periodTransactions
      },
      revenueByPeriod
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== SYSTEM HEALTH =====

// Get system health metrics
router.get('/system/health', async (req, res) => {
  try {
    const [
      userCount,
      portfolioCount,
      transactionCount,
      pendingApprovals,
      blockedUsers
    ] = await Promise.all([
      User.countDocuments(),
      PortfolioItem.countDocuments(),
      Transaction.countDocuments(),
      PortfolioItem.countDocuments({ isApproved: false }),
      User.countDocuments({ isBlocked: true })
    ]);

    res.json({
      status: 'healthy',
      timestamp: new Date(),
      metrics: {
        users: userCount,
        portfolioItems: portfolioCount,
        transactions: transactionCount,
        pendingApprovals,
        blockedUsers
      }
    });
  } catch (error) {
    console.error('System health error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
