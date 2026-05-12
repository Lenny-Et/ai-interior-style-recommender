import express from 'express';
import { User } from '../models/User.js';
import { PortfolioItem } from '../models/PortfolioItem.js';
import { Like } from '../models/Like.js';
import { Save } from '../models/Save.js';
import { Follow } from '../models/Follow.js';
import { CustomRequest } from '../models/CustomRequest.js';
import { Transaction } from '../models/Transaction.js';
import { SupportTicket } from '../models/SupportTicket.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get admin analytics overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { timeRange = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    // Get user counts by role
    const totalUsers = await User.countDocuments();
    const homeowners = await User.countDocuments({ role: 'homeowner' });
    const designers = await User.countDocuments({ role: 'designer' });
    const admins = await User.countDocuments({ role: 'admin' });

    // Get platform stats
    const totalPortfolioItems = await PortfolioItem.countDocuments();
    const totalViews = await PortfolioItem.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);

    const totalLikes = await Like.countDocuments();
    const totalSaves = await Save.countDocuments();
    const totalFollows = await Follow.countDocuments();

    // Get transaction stats
    const totalTransactions = await Transaction.countDocuments();
    const totalRevenue = await Transaction.aggregate([
      { $match: { status: { $in: ['completed', 'held_in_escrow', 'released_to_designer'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);

    const totalCommission = await Transaction.aggregate([
      { $match: { status: { $in: ['completed', 'held_in_escrow', 'released_to_designer'] } } },
      { $group: { _id: null, totalCommission: { $sum: '$commissionAmount' } } }
    ]);

    // Get custom requests stats
    const totalRequests = await CustomRequest.countDocuments();
    const completedRequests = await CustomRequest.countDocuments({ status: 'Completed' });
    const pendingRequests = await CustomRequest.countDocuments({ status: 'Pending' });
    const inProgressRequests = await CustomRequest.countDocuments({ status: 'In-Progress' });

    // Get support tickets stats
    const totalTickets = await SupportTicket.countDocuments();
    const openTickets = await SupportTicket.countDocuments({ status: 'open' });
    const resolvedTickets = await SupportTicket.countDocuments({ status: 'resolved' });

    // Get monthly data for charts
    const monthlyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateTrunc: { date: '$createdAt', unit: 'month' } },
          homeowners: { $sum: { $cond: [{ $eq: ['$role', 'homeowner'] }, 1, 0] } },
          designers: { $sum: { $cond: [{ $eq: ['$role', 'designer'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const monthlyRevenue = await Transaction.aggregate([
      { $match: { status: { $in: ['completed', 'held_in_escrow', 'released_to_designer'] }, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateTrunc: { date: '$createdAt', unit: 'month' } },
          revenue: { $sum: '$amount' },
          commission: { $sum: '$commissionAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const monthlyRequests = await CustomRequest.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateTrunc: { date: '$createdAt', unit: 'month' } },
          requests: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get top performers
    const topDesigners = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$designerId',
          earnings: { $sum: '$designerPayout' },
          projects: { $sum: 1 }
        }
      },
      { $sort: { earnings: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'designer'
        }
      },
      { $unwind: '$designer' },
      {
        $project: {
          name: { $concat: ['$designer.profile.firstName', ' ', '$designer.profile.lastName'] },
          email: '$designer.email',
          earnings: 1,
          projects: 1
        }
      }
    ]);

    // Get recent activity
    const recentUsers = await User.find({ createdAt: { $gte: startDate } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('profile.firstName profile.lastName email role createdAt');

    const recentTransactions = await Transaction.find({ createdAt: { $gte: startDate } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('homeownerId', 'profile.firstName profile.lastName')
      .populate('designerId', 'profile.firstName profile.lastName')
      .select('tx_ref amount status createdAt');

    res.json({
      overview: {
        totalUsers,
        homeowners,
        designers,
        admins,
        totalPortfolioItems,
        totalViews: totalViews[0]?.totalViews || 0,
        totalLikes,
        totalSaves,
        totalFollows,
        totalTransactions,
        totalRevenue: totalRevenue[0]?.totalRevenue || 0,
        totalCommission: totalCommission[0]?.totalCommission || 0,
        totalRequests,
        completedRequests,
        pendingRequests,
        inProgressRequests,
        totalTickets,
        openTickets,
        resolvedTickets
      },
      monthlyData: {
        users: monthlyUsers.map(month => ({
          month: month._id.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          homeowners: month.homeowners,
          designers: month.designers,
          total: month.total
        })),
        revenue: monthlyRevenue.map(month => ({
          month: month._id.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: month.revenue || 0,
          commission: month.commission || 0,
          count: month.count || 0
        })),
        requests: monthlyRequests.map(month => ({
          month: month._id.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          requests: month.requests,
          completed: month.completed
        }))
      },
      topPerformers: topDesigners,
      recentActivity: {
        users: recentUsers,
        transactions: recentTransactions
      }
    });
  } catch (error) {
    console.error('Get admin analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users for admin management
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { page = 1, limit = 20, role, status, search } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('profile.firstName profile.lastName email role status createdAt lastLogin');

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user status
router.put('/users/:userId/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { userId: targetUserId } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(
      targetUserId,
      { status },
      { new: true }
    ).select('profile.firstName profile.lastName email role status');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all transactions for admin
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    console.log('Admin transactions request:', { userId, userRole });
    
    // Admin-only access
    if (userRole !== 'admin') {
      console.log('Access denied - user is not admin:', userRole);
      return res.status(403).json({ error: 'Access denied - admin only' });
    }

    const { 
      page = 1, 
      limit = 50, 
      status, 
      startDate, 
      endDate,
      search 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Search functionality
    let searchPipeline = [];
    if (search) {
      searchPipeline = [
        {
          $lookup: {
            from: 'users',
            localField: 'homeownerId',
            foreignField: '_id',
            as: 'homeowner'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'designerId',
            foreignField: '_id',
            as: 'designer'
          }
        },
        {
          $match: {
            $or: [
              { tx_ref: { $regex: search, $options: 'i' } },
              { 'homeowner.profile.firstName': { $regex: search, $options: 'i' } },
              { 'homeowner.profile.lastName': { $regex: search, $options: 'i' } },
              { 'designer.profile.firstName': { $regex: search, $options: 'i' } },
              { 'designer.profile.lastName': { $regex: search, $options: 'i' } }
            ]
          }
        }
      ];
    }

    // Get transactions with populated user data
    let transactions;
    let total;

    if (search) {
      // For search, use aggregation pipeline
      const pipeline = [
        { $match: query },
        ...searchPipeline,
        {
          $project: {
            tx_ref: 1,
            amount: 1,
            commissionAmount: 1,
            designerPayout: 1,
            status: 1,
            projectStatus: 1,
            purchaseType: 1,
            createdAt: 1,
            homeownerFirstName: { $arrayElemAt: ['$homeowner.profile.firstName', 0] },
            homeownerLastName: { $arrayElemAt: ['$homeowner.profile.lastName', 0] },
            homeownerEmail: { $arrayElemAt: ['$homeowner.email', 0] },
            designerFirstName: { $arrayElemAt: ['$designer.profile.firstName', 0] },
            designerLastName: { $arrayElemAt: ['$designer.profile.lastName', 0] },
            designerEmail: { $arrayElemAt: ['$designer.email', 0] }
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum }
      ];

      transactions = await Transaction.aggregate(pipeline);
      
      // Get total count for search
      const countPipeline = [
        { $match: query },
        ...searchPipeline,
        { $count: 'total' }
      ];
      const countResult = await Transaction.aggregate(countPipeline);
      total = countResult[0]?.total || 0;
    } else {
      // Regular query without search
      transactions = await Transaction.find(query)
        .populate('homeownerId', 'profile.firstName profile.lastName email')
        .populate('designerId', 'profile.firstName profile.lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      total = await Transaction.countDocuments(query);
    }

    // Calculate summary statistics
    const [totalRevenue, totalCommission, totalTransactions] = await Promise.all([
      Transaction.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
      ]),
      Transaction.countDocuments(query)
    ]);

    // Fetch user data manually if population didn't work
    const userIds = new Set();
    transactions.forEach(tx => {
      if (tx.homeownerId) userIds.add(tx.homeownerId);
      if (tx.designerId) userIds.add(tx.designerId);
    });

    const usersMap = new Map();
    if (userIds.size > 0) {
      const users = await User.find({ _id: { $in: Array.from(userIds) } });
      users.forEach(user => {
        usersMap.set(user._id.toString(), user);
      });
    }

    const responseData = {
      transactions: transactions.map(tx => {
        // Handle homeowner data
        let homeownerName = 'Unknown User';
        let homeownerEmail = '';
        
        if (tx.homeownerId) {
          const homeowner = usersMap.get(tx.homeownerId.toString());
          if (homeowner) {
            const firstName = homeowner.profile?.firstName || homeowner.firstName || '';
            const lastName = homeowner.profile?.lastName || homeowner.lastName || '';
            homeownerName = `${firstName} ${lastName}`.trim() || 'Unknown User';
            homeownerEmail = homeowner.email || '';
          } else {
            homeownerName = 'User ID: ' + tx.homeownerId;
          }
        }
        
        // Handle designer data
        let designerName = 'AI System';
        let designerEmail = '';
        
        if (tx.designerId) {
          const designer = usersMap.get(tx.designerId.toString());
          if (designer) {
            const firstName = designer.profile?.firstName || designer.firstName || '';
            const lastName = designer.profile?.lastName || designer.lastName || '';
            designerName = `${firstName} ${lastName}`.trim() || 'Unknown Designer';
            designerEmail = designer.email || '';
          } else {
            designerName = 'Designer ID: ' + tx.designerId;
          }
        } else {
          // AI System purchase
          designerName = 'AI System';
          designerEmail = '';
        }

        return {
          id: tx.tx_ref,
          date: tx.createdAt,
          buyer: homeownerName,
          buyerEmail: homeownerEmail,
          seller: designerName,
          sellerEmail: designerEmail,
          amount: tx.amount,
          commission: tx.commissionAmount || 0,
          designerPayout: tx.designerPayout || 0,
          status: tx.status,
          projectStatus: tx.projectStatus,
          purchaseType: tx.purchaseType,
          chapaId: tx.tx_ref
        };
      }),
      summary: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalCommission: totalCommission[0]?.total || 0,
        totalTransactions: totalTransactions,
        avgCommissionPct: totalRevenue[0]?.total > 0 
          ? ((totalCommission[0]?.total || 0) / totalRevenue[0].total * 100).toFixed(1)
          : '0.0'
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };

    console.log('Admin transactions response:', {
      transactionsCount: responseData.transactions.length,
      summary: responseData.summary,
      pagination: responseData.pagination
    });

    res.json(responseData);
  } catch (error) {
    console.error('Get admin transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get revenue analytics for admin
router.get('/revenue-analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Admin-only access
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied - admin only' });
    }

    const { timeRange = '7m' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const months = timeRange === '3m' ? 3 : timeRange === '7m' ? 7 : 12;
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    // Get monthly revenue data
    const monthlyRevenue = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['released_to_designer', 'completed', 'held_in_escrow'] }
        }
      },
      {
        $group: {
          _id: { $dateTrunc: { date: '$createdAt', unit: 'month' } },
          revenue: { $sum: '$amount' },
          commission: { $sum: '$commissionAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format data for frontend
    const revenueData = monthlyRevenue.map(month => ({
      month: month._id.toLocaleDateString('en-US', { month: 'short' }),
      revenue: month.revenue || 0,
      commission: month.commission || 0
    }));

    res.json({
      revenueData,
      timeRange,
      period: {
        start: startDate,
        end: now
      }
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
