import express from 'express';
import { PortfolioItem } from '../models/PortfolioItem.js';
import { User } from '../models/User.js';
import { Like } from '../models/Like.js';
import { Follow } from '../models/Follow.js';

const router = express.Router();

// Search designs
router.get('/designs', async (req, res) => {
  try {
    const {
      q = '', // search query
      style,
      roomType,
      sortBy = 'relevance', // relevance, recent, popular, trending
      page = 1,
      limit = 20,
      minPrice,
      maxPrice,
      designerVerified
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = {};

    // Text search
    if (q) {
      query.$or = [
        { description: { $regex: q, $options: 'i' } },
        { 'metadata.style': { $regex: q, $options: 'i' } },
        { 'metadata.roomType': { $regex: q, $options: 'i' } }
      ];
    }

    // Style filter
    if (style) {
      const styles = Array.isArray(style) ? style : [style];
      query['metadata.style'] = { $in: styles };
    }

    // Room type filter
    if (roomType) {
      const roomTypes = Array.isArray(roomType) ? roomType : [roomType];
      query['metadata.roomType'] = { $in: roomTypes };
    }

    // Designer verification filter
    if (designerVerified === 'true') {
      // Will need to join with User collection
    }

    // Price range filter (if price metadata is added)
    if (minPrice || maxPrice) {
      query['metadata.price'] = {};
      if (minPrice) query['metadata.price'].$gte = parseFloat(minPrice);
      if (maxPrice) query['metadata.price'].$lte = parseFloat(maxPrice);
    }

    // Build sort options
    let sortOptions = {};
    switch (sortBy) {
      case 'recent':
        sortOptions = { createdAt: -1 };
        break;
      case 'popular':
        sortOptions = { likeCount: -1 };
        break;
      case 'trending':
        sortOptions = { trendingScore: -1 };
        break;
      case 'relevance':
      default:
        sortOptions = { createdAt: -1 }; // Use recent sort as fallback
        break;
    }

    // Execute search with aggregation for better performance
    const pipeline = [];

    // Match stage
    if (Object.keys(query).length > 0) {
      pipeline.push({ $match: query });
    }

    // Add engagement metrics
    pipeline.push(
      {
        $lookup: {
          from: 'likes',
          localField: '_id',
          foreignField: 'targetId',
          as: 'likes'
        }
      },
      {
        $lookup: {
          from: 'shares',
          localField: '_id',
          foreignField: 'targetId',
          as: 'shares'
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
        $addFields: {
          likeCount: { $size: '$likes' },
          shareCount: { $size: '$shares' },
          engagementScore: {
            $add: [
              { $size: '$likes' },
              { $multiply: [{ $size: '$shares' }, 2] }
            ]
          },
          trendingScore: {
            $add: [
              { $multiply: [{ $size: '$likes' }, 0.7] },
              { $multiply: [{ $size: '$shares' }, 0.3] },
              { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 1000 * 60 * 60 * 24] } // Days since creation
            ]
          }
        }
      },
      { $unwind: '$designer' }
    );

    // Filter by designer verification if requested
    if (designerVerified === 'true') {
      pipeline.push({
        $match: { 'designer.is_verified': true }
      });
    }

    // Sort
    pipeline.push({ $sort: sortOptions });

    // Pagination
    pipeline.push(
      { $skip: skip },
      { $limit: limitNum }
    );

    const designs = await PortfolioItem.aggregate(pipeline);

    // Get total count for pagination
    const total = await PortfolioItem.countDocuments(query);

    res.json({
      designs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      filters: {
        query: q,
        style,
        roomType,
        sortBy,
        designerVerified,
        priceRange: { min: minPrice, max: maxPrice }
      }
    });
  } catch (error) {
    console.error('Search designs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search designers
router.get('/designers', async (req, res) => {
  try {
    const {
      q = '',
      specialty,
      verified,
      minProjects,
      maxProjects,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = { role: 'designer' };

    // Text search
    if (q) {
      query.$or = [
        { 'profile.firstName': { $regex: q, $options: 'i' } },
        { 'profile.lastName': { $regex: q, $options: 'i' } },
        { 'profile.company': { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    // Specialty filter
    if (specialty) {
      const specialties = Array.isArray(specialty) ? specialty : [specialty];
      query.specialty = { $in: specialties };
    }

    // Verification filter
    if (verified === 'true') {
      query.is_verified = true;
    } else if (verified === 'false') {
      query.is_verified = false;
    }

    // Build pipeline
    const pipeline = [];

    // Match stage
    pipeline.push({ $match: query });

    // Add project counts
    pipeline.push(
      {
        $lookup: {
          from: 'portfolioitems',
          localField: '_id',
          foreignField: 'designerId',
          as: 'portfolio'
        }
      },
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
          projectCount: { $size: '$portfolio' },
          followerCount: { $size: '$followers' },
          averageRating: { $avg: '$portfolio.rating' }
        }
      }
    );

    // Filter by project count
    if (minProjects || maxProjects) {
      const projectFilter = {};
      if (minProjects) projectFilter.$gte = parseInt(minProjects);
      if (maxProjects) projectFilter.$lte = parseInt(maxProjects);
      pipeline.push({ $match: { projectCount: projectFilter } });
    }

    // Sort
    let sortOptions = {};
    switch (sortBy) {
      case 'projects':
        sortOptions = { projectCount: -1 };
        break;
      case 'followers':
        sortOptions = { followerCount: -1 };
        break;
      case 'rating':
        sortOptions = { averageRating: -1 };
        break;
      case 'recent':
        sortOptions = { createdAt: -1 };
        break;
      case 'relevance':
      default:
        sortOptions = { createdAt: -1 }; // Use recent sort as fallback
        break;
    }

    pipeline.push({ $sort: sortOptions });

    // Pagination
    pipeline.push(
      { $skip: skip },
      { $limit: limitNum }
    );

    // Remove sensitive fields
    pipeline.push(
      {
        $project: {
          passwordHash: 0,
          email: 0
        }
      }
    );

    const designers = await User.aggregate(pipeline);

    // Get total count
    const total = await User.countDocuments(query);

    res.json({
      designers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      filters: {
        query: q,
        specialty,
        verified,
        projectCountRange: { min: minProjects, max: maxProjects },
        sortBy
      }
    });
  } catch (error) {
    console.error('Search designers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Combined search (search both designs and designers)
router.get('/combined', async (req, res) => {
  try {
    const {
      q = '',
      page = 1,
      limit = 10,
      type = 'all' // all, designs, designers
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let results = {};

    // Search designs
    if (type === 'all' || type === 'designs') {
      const designQuery = q ? {
        $or: [
          { description: { $regex: q, $options: 'i' } },
          { 'metadata.style': { $regex: q, $options: 'i' } },
          { 'metadata.roomType': { $regex: q, $options: 'i' } }
        ]
      } : {};

      const designs = await PortfolioItem.find(designQuery)
        .populate('designerId', 'profile profilePicture is_verified')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      const designTotal = await PortfolioItem.countDocuments(designQuery);

      results.designs = {
        items: designs,
        total: designTotal,
        pages: Math.ceil(designTotal / limitNum)
      };
    }

    // Search designers
    if (type === 'all' || type === 'designers') {
      const designerQuery = {
        role: 'designer',
        ...(q && {
          $or: [
            { 'profile.firstName': { $regex: q, $options: 'i' } },
            { 'profile.lastName': { $regex: q, $options: 'i' } },
            { 'profile.company': { $regex: q, $options: 'i' } }
          ]
        })
      };

      const designers = await User.find(designerQuery)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      const designerTotal = await User.countDocuments(designerQuery);

      results.designers = {
        items: designers,
        total: designerTotal,
        pages: Math.ceil(designerTotal / limitNum)
      };
    }

    res.json({
      query: q,
      type,
      page: pageNum,
      limit: limitNum,
      results
    });
  } catch (error) {
    console.error('Combined search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get search suggestions/autocomplete
router.get('/suggestions', async (req, res) => {
  try {
    const { q = '', type = 'all' } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    let suggestions = [];

    // Style suggestions
    if (type === 'all' || type === 'styles') {
      const styles = await PortfolioItem.distinct('metadata.style', {
        'metadata.style': { $regex: q, $options: 'i' }
      });
      suggestions.push(...styles.slice(0, 5).map(style => ({
        type: 'style',
        value: style,
        label: style
      })));
    }

    // Room type suggestions
    if (type === 'all' || type === 'rooms') {
      const rooms = await PortfolioItem.distinct('metadata.roomType', {
        'metadata.roomType': { $regex: q, $options: 'i' }
      });
      suggestions.push(...rooms.slice(0, 5).map(room => ({
        type: 'room',
        value: room,
        label: room
      })));
    }

    // Designer suggestions
    if (type === 'all' || type === 'designers') {
      const designers = await User.find({
        role: 'designer',
        $or: [
          { 'profile.firstName': { $regex: q, $options: 'i' } },
          { 'profile.lastName': { $regex: q, $options: 'i' } },
          { 'profile.company': { $regex: q, $options: 'i' } }
        ]
      })
      .select('profile.firstName profile.lastName profile.company')
      .limit(5);

      suggestions.push(...designers.map(designer => ({
        type: 'designer',
        value: designer._id,
        label: `${designer.profile.firstName} ${designer.profile.lastName}`.trim() || designer.profile.company
      })));
    }

    // Limit total suggestions
    suggestions = suggestions.slice(0, 10);

    res.json({ suggestions });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get popular search filters
router.get('/popular-filters', async (req, res) => {
  try {
    const { type } = req.query;

    let filters = {};

    if (type === 'styles' || !type) {
      filters.styles = await PortfolioItem.aggregate([
        { $group: { _id: '$metadata.style', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
    }

    if (type === 'rooms' || !type) {
      filters.rooms = await PortfolioItem.aggregate([
        { $group: { _id: '$metadata.roomType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
    }

    if (type === 'specialties' || !type) {
      // This would come from user profiles - placeholder for now
      filters.specialties = [
        { _id: 'Modern', count: 156 },
        { _id: 'Scandinavian', count: 124 },
        { _id: 'Industrial', count: 98 },
        { _id: 'Minimalist', count: 87 },
        { _id: 'Bohemian', count: 76 }
      ];
    }

    res.json(filters);
  } catch (error) {
    console.error('Popular filters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
