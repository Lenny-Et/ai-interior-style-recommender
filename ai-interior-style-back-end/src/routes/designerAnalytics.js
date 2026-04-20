import express from 'express';
import mongoose from 'mongoose';
import { PortfolioItem } from '../models/PortfolioItem.js';
import { Like } from '../models/Like.js';
import { Save } from '../models/Save.js';
import { Follow } from '../models/Follow.js';
import { CustomRequest } from '../models/CustomRequest.js';
import { Transaction } from '../models/Transaction.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get designer analytics overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    if (userRole !== 'designer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { timeRange = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    // Get portfolio stats
    const totalPortfolioItems = await PortfolioItem.countDocuments({ designerId: userId });
    const totalViews = await PortfolioItem.aggregate([
      { $match: { designerId: userId } },
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);

    // Get likes stats
    const totalLikes = await Like.countDocuments({
      targetType: 'portfolio',
      targetId: { $in: await PortfolioItem.find({ designerId: userId }).distinct('_id') }
    });

    // Get saves stats
    const totalSaves = await Save.countDocuments({
      targetType: 'portfolio',
      targetId: { $in: await PortfolioItem.find({ designerId: userId }).distinct('_id') }
    });

    // Get followers count
    const followerCount = await Follow.countDocuments({ followingId: userId });

    // Get completed projects and earnings
    const completedRequests = await CustomRequest.countDocuments({
      designerId: userId,
      status: 'Completed'
    });

    const transactions = await Transaction.find({
      designerId: userId,
      status: 'completed'
    });

    const totalEarnings = transactions.reduce((sum, tx) => sum + tx.designerPayout || 0, 0);

    // Get monthly data for charts
    const monthlyData = await PortfolioItem.aggregate([
      { $match: { designerId: userId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateTrunc: { date: '$createdAt', unit: 'month' } },
          views: { $sum: '$views' },
          items: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const monthlyLikes = await Like.aggregate([
      {
        $match: {
          targetType: 'portfolio',
          createdAt: { $gte: startDate },
          targetId: { $in: await PortfolioItem.find({ designerId: userId }).distinct('_id') }
        }
      },
      {
        $group: {
          _id: { $dateTrunc: { date: '$createdAt', unit: 'month' } },
          likes: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Combine monthly data
    const combinedMonthlyData = monthlyData.map(month => {
      const likesData = monthlyLikes.find(l => l._id.getTime() === month._id.getTime());
      return {
        month: month._id.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        views: month.views,
        likes: likesData?.likes || 0,
        items: month.items
      };
    });

    // Get top performing designs
    const topDesigns = await PortfolioItem.find({ designerId: userId })
      .sort({ views: -1 })
      .limit(5)
      .select('imageUrl metadata views createdAt');

    // Get recent activity
    const recentActivity = await Promise.all([
      Like.find({
        targetType: 'portfolio',
        createdAt: { $gte: startDate },
        targetId: { $in: await PortfolioItem.find({ designerId: userId }).distinct('_id') }
      }).sort({ createdAt: -1 }).limit(5),
      Save.find({
        targetType: 'portfolio',
        createdAt: { $gte: startDate },
        targetId: { $in: await PortfolioItem.find({ designerId: userId }).distinct('_id') }
      }).sort({ createdAt: -1 }).limit(5)
    ]);

    res.json({
      overview: {
        totalPortfolioItems,
        totalViews: totalViews[0]?.totalViews || 0,
        totalLikes,
        totalSaves,
        followerCount,
        completedProjects: completedRequests,
        totalEarnings,
        averageViewsPerItem: totalPortfolioItems > 0 ? Math.round((totalViews[0]?.totalViews || 0) / totalPortfolioItems) : 0
      },
      monthlyData: combinedMonthlyData,
      topDesigns: topDesigns.map(design => ({
        title: design.metadata?.title || 'Untitled Design',
        views: design.views,
        imageUrl: design.imageUrl,
        createdAt: design.createdAt
      })),
      recentActivity: {
        likes: recentActivity[0].length,
        saves: recentActivity[1].length
      }
    });
  } catch (error) {
    console.error('Get designer analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get designer earnings data
router.get('/earnings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    if (userRole !== 'designer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { timeRange = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    // Get all released transactions (funds released to designer)
    const transactions = await Transaction.find({
      designerId: userId,
      status: 'released_to_designer',
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });

    // Calculate earnings
    const totalEarnings = transactions.reduce((sum, tx) => sum + (tx.designerPayout || 0), 0);
    const totalCommission = transactions.reduce((sum, tx) => sum + (tx.commissionAmount || 0), 0);

    // Get monthly earnings
    const monthlyEarnings = await Transaction.aggregate([
      {
        $match: {
          designerId: new mongoose.Types.ObjectId(userId),
          status: 'released_to_designer',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateTrunc: { date: '$createdAt', unit: 'month' } },
          earnings: { $sum: '$designerPayout' },
          commission: { $sum: '$commissionAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get earnings by room type
    const earningsByRoomType = await Transaction.aggregate([
      {
        $match: {
          designerId: new mongoose.Types.ObjectId(userId),
          status: 'released_to_designer',
          createdAt: { $gte: startDate }
        }
      },
      {
        $addFields: {
          // Add fallback to avoid errors if sessionId is missing or invalid format
          requestObjectId: { 
            $convert: { 
              input: "$sessionId", 
              to: "objectId", 
              onError: null, 
              onNull: null 
            } 
          }
        }
      },
      {
        $lookup: {
          from: 'customrequests',
          localField: 'requestObjectId',
          foreignField: '_id',
          as: 'request'
        }
      },
      {
        $unwind: '$request'
      },
      {
        $group: {
          _id: '$request.roomType',
          earnings: { $sum: '$designerPayout' },
          count: { $sum: 1 }
        }
      },
      { $sort: { earnings: -1 } }
    ]);

    // Get pending payouts
    const pendingTransactions = await Transaction.find({
      designerId: userId,
      status: 'held_in_escrow'
    });

    const pendingAmount = pendingTransactions.reduce((sum, tx) => sum + (tx.designerPayout || 0), 0);

    res.json({
      totalEarnings,
      totalCommission,
      netEarnings: totalEarnings,
      pendingAmount,
      completedTransactions: transactions.length,
      monthlyEarnings: monthlyEarnings.map(month => ({
        month: month._id.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        earnings: month.earnings || 0,
        commission: month.commission || 0,
        count: month.count || 0
      })),
      earningsByRoomType: earningsByRoomType.map(type => ({
        roomType: type._id,
        earnings: type.earnings || 0,
        count: type.count || 0
      })),
      recentTransactions: transactions.slice(0, 10).map(tx => ({
        tx_ref: tx.tx_ref,
        amount: tx.designerPayout || 0,
        date: tx.createdAt,
        projectStatus: tx.projectStatus
      }))
    });
  } catch (error) {
    console.error('Get designer earnings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
