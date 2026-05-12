import express from 'express';
import { UserDesignLibrary } from '../models/UserDesignLibrary.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user's design library
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Strict security: ALWAYS use the authenticated user's ID from the JWT token.
    // Never trust req.query.userId from the client, otherwise users can view others' data.
    const userId = req.user.userId;
    const { 
      page = 1, 
      limit = 20, 
      status = 'active',
      sortBy = 'purchaseDate',
      sortOrder = 'desc',
      favoritesOnly = false
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = { userId };
    
    if (status !== 'all') {
      query.status = status;
    }
    
    if (favoritesOnly === 'true') {
      query['userInteractions.isFavorite'] = true;
    }

    // Sort options
    const sortOptions = {};
    switch (sortBy) {
      case 'purchaseDate':
        sortOptions['purchaseInfo.purchaseDate'] = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'name':
        sortOptions['designData.name'] = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'style':
        sortOptions['designData.style'] = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'viewCount':
        sortOptions['userInteractions.viewCount'] = sortOrder === 'desc' ? -1 : 1;
        break;
      default:
        sortOptions['purchaseInfo.purchaseDate'] = -1;
    }

    const designs = await UserDesignLibrary.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const total = await UserDesignLibrary.countDocuments(query);

    res.json({
      designs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      summary: {
        totalDesigns: total,
        favoriteCount: await UserDesignLibrary.countDocuments({ 
          userId, 
          'userInteractions.isFavorite': true,
          status: 'active'
        }),
        totalSpent: await UserDesignLibrary.aggregate([
          { $match: { userId, status: 'active' } },
          { $group: { _id: null, total: { $sum: '$purchaseInfo.amount' } } }
        ]).then(result => result[0]?.total || 0)
      }
    });
  } catch (error) {
    console.error('Get user designs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific design by ID
router.get('/:designId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { designId } = req.params;

    const design = await UserDesignLibrary.findOne({ 
      userId, 
      designId,
      status: 'active'
    });

    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }

    // Increment view count
    design.userInteractions.viewCount += 1;
    design.userInteractions.lastViewed = new Date();
    await design.save();

    res.json(design);
  } catch (error) {
    console.error('Get design error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update design interactions (favorite, notes, etc.)
router.patch('/:designId/interactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { designId } = req.params;
    const { isFavorite, isShared, notes } = req.body;

    const design = await UserDesignLibrary.findOne({ 
      userId, 
      designId,
      status: 'active'
    });

    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }

    // Update interactions
    if (typeof isFavorite === 'boolean') {
      design.userInteractions.isFavorite = isFavorite;
    }
    
    if (typeof isShared === 'boolean') {
      design.userInteractions.isShared = isShared;
    }
    
    if (typeof notes === 'string') {
      design.userInteractions.notes = notes;
    }

    await design.save();

    res.json({
      message: 'Design interactions updated successfully',
      interactions: design.userInteractions
    });
  } catch (error) {
    console.error('Update design interactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Archive/unarchive design
router.patch('/:designId/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { designId } = req.params;
    const { status } = req.body;

    if (!['active', 'archived', 'hidden'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const design = await UserDesignLibrary.findOne({ 
      userId, 
      designId
    });

    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }

    design.status = status;
    await design.save();

    res.json({
      message: 'Design status updated successfully',
      status: design.status
    });
  } catch (error) {
    console.error('Update design status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get design statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [
      totalDesigns,
      favoriteDesigns,
      archivedDesigns,
      totalSpent,
      recentDesigns,
      styleDistribution
    ] = await Promise.all([
      UserDesignLibrary.countDocuments({ userId, status: 'active' }),
      UserDesignLibrary.countDocuments({ userId, status: 'active', 'userInteractions.isFavorite': true }),
      UserDesignLibrary.countDocuments({ userId, status: 'archived' }),
      UserDesignLibrary.aggregate([
        { $match: { userId, status: 'active' } },
        { $group: { _id: null, total: { $sum: '$purchaseInfo.amount' } } }
      ]).then(result => result[0]?.total || 0),
      UserDesignLibrary.find({ userId, status: 'active' })
        .sort({ 'purchaseInfo.purchaseDate': -1 })
        .limit(5),
      UserDesignLibrary.aggregate([
        { $match: { userId, status: 'active' } },
        { $group: { _id: '$designData.style', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      overview: {
        totalDesigns,
        favoriteDesigns,
        archivedDesigns,
        totalSpent,
        averageDesignCost: totalDesigns > 0 ? Math.round(totalSpent / totalDesigns) : 0
      },
      recentDesigns,
      styleDistribution
    });
  } catch (error) {
    console.error('Get design stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
