import express from 'express';
import { UserDesignLibrary } from '../models/UserDesignLibrary.js';
import { AIRecommendation } from '../models/AIRecommendation.js';
import { authenticateToken } from '../middleware/auth.js';
import * as fsp from 'fs/promises';
import path from 'path';

// Helper to migrate base64 image data URL to a local file
async function migrateBase64Image(base64Data, prefix = 'library-design') {
  try {
    if (!base64Data || !base64Data.startsWith('data:')) {
      return base64Data; // Return as-is if it's already a URL
    }

    // Extract the mime type and the base64 payload
    const matches = base64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64Data;
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fsp.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, filename);
    await fsp.writeFile(filePath, buffer);

    const port = process.env.PORT || 5000;
    return `http://localhost:${port}/uploads/${filename}`;
  } catch (err) {
    console.error('Failed to migrate base64 image locally:', err);
    return base64Data;
  }
}

const router = express.Router();

// Get user's design library
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      console.error('Authentication failed: req.user or req.user.userId is missing');
      return res.status(401).json({ error: 'Authentication required', message: 'You must be logged in to view your design library' });
    }
    
    // Strict security: ALWAYS use the authenticated user's ID from the JWT token.
    // Never trust req.query.userId from the client, otherwise users can view others' data.
    const userId = req.user.userId;
    console.log(`Fetching designs for userId: ${userId}`);

    // Self-healing sync: dynamically find all AI recommendations for this user and ensure they are populated in the design library.
    // Optimized: Runs in the background, uses a Set for memory-based lookup, and bulk inserts to avoid blocking the API request.
    const runBackgroundSync = async () => {
      try {
        const [pastRecommendations, existingDesigns] = await Promise.all([
          AIRecommendation.find({ userId, status: 'active' }).lean(),
          UserDesignLibrary.find({ userId }, { designId: 1 }).lean()
        ]);

        if (!pastRecommendations || pastRecommendations.length === 0) return;

        const existingDesignIds = new Set(existingDesigns.map(d => d.designId));
        const designsToInsert = [];

        for (const session of pastRecommendations) {
          for (const rec of session.recommendations) {
            const designId = `design-${session.sessionId}-${rec.id || Math.random().toString(36).substring(7)}`;
            
            if (!existingDesignIds.has(designId)) {
              designsToInsert.push({
                userId,
                designId,
                designData: {
                  name: rec.name || 'AI Generated Design',
                  description: rec.description || `Beautiful ${rec.style || 'Modern'} ${rec.roomType || 'Living Room'} design.`,
                  style: rec.style || 'Modern',
                  roomType: session.metadata?.roomType || 'Living Room',
                  budget: session.metadata?.budget || '$1,000-$2,500',
                  products: rec.products || [],
                  imageUrl: rec.imageUrl || session.imageUrl,
                  confidence: rec.confidence || 0.85,
                  isPremium: false,
                  recommendationId: rec.id,
                  metadata: {
                    style: rec.style || 'Modern',
                    roomType: session.metadata?.roomType || 'Living Room',
                    colorPalette: rec.details?.colorPalette || ['#FFFFFF', '#000000']
                  }
                },
                sessionData: {
                  sessionId: session.sessionId,
                  originalImageUrl: session.imageUrl,
                  userPreferences: {
                    roomType: session.metadata?.roomType || 'Living Room',
                    styles: session.metadata?.styles || [],
                    budget: session.metadata?.budget || '$1,000-$2,500'
                  },
                  generatedAt: session.createdAt
                },
                purchaseInfo: {
                  amount: 0,
                  purchaseDate: session.createdAt || new Date(),
                  paymentMethod: 'free_generation',
                  transactionRef: 'free-generation'
                },
                status: 'active',
                accessLevel: 'full'
              });
            }
          }
        }

        if (designsToInsert.length > 0) {
          await UserDesignLibrary.insertMany(designsToInsert, { ordered: false });
          console.log(`✅ Dynamically synced ${designsToInsert.length} past generated designs to library for user ${userId}`);
        }
      } catch (syncErr) {
        // Handle unique key / duplicate errors gracefully if bulk insert races
        if (syncErr.code === 11000) {
          console.log('Library sync completed with duplicate key prevention.');
        } else {
          console.error('Error during background design library sync:', syncErr);
        }
      }
    };

    // Trigger sync in the background so it doesn't block the page load
    runBackgroundSync().catch(err => console.error('Background sync failure:', err));

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
      .limit(limitNum)
      .lean();

    // Proactive self-healing database migration for any legacy base64 images
    for (let i = 0; i < designs.length; i++) {
      const design = designs[i];
      let updated = false;

      if (design.designData?.imageUrl && design.designData.imageUrl.startsWith('data:image')) {
        console.log(`Migrating designData.imageUrl base64 for designId: ${design.designId}`);
        const localUrl = await migrateBase64Image(design.designData.imageUrl, `design-${design.designId}`);
        if (localUrl !== design.designData.imageUrl) {
          design.designData.imageUrl = localUrl;
          updated = true;
        }
      }

      if (design.sessionData?.originalImageUrl && design.sessionData.originalImageUrl.startsWith('data:image')) {
        console.log(`Migrating sessionData.originalImageUrl base64 for designId: ${design.designId}`);
        const localUrl = await migrateBase64Image(design.sessionData.originalImageUrl, `orig-${design.designId}`);
        if (localUrl !== design.sessionData.originalImageUrl) {
          design.sessionData.originalImageUrl = localUrl;
          updated = true;
        }
      }

      if (updated) {
        // Save the cleaned URL to MongoDB asynchronously to keep this request super fast
        UserDesignLibrary.updateOne(
          { _id: design._id },
          { 
            $set: { 
              'designData.imageUrl': design.designData.imageUrl,
              'sessionData.originalImageUrl': design.sessionData.originalImageUrl
            } 
          }
        ).catch(err => console.error(`Failed to save migrated base64 URL for design ${design.designId}:`, err));
      }
    }

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

    // Lazy base64 migration for details view
    let updated = false;
    if (design.designData?.imageUrl && design.designData.imageUrl.startsWith('data:image')) {
      const localUrl = await migrateBase64Image(design.designData.imageUrl, `design-${design.designId}`);
      if (localUrl !== design.designData.imageUrl) {
        design.designData.imageUrl = localUrl;
        design.markModified('designData');
        updated = true;
      }
    }
    if (design.sessionData?.originalImageUrl && design.sessionData.originalImageUrl.startsWith('data:image')) {
      const localUrl = await migrateBase64Image(design.sessionData.originalImageUrl, `orig-${design.designId}`);
      if (localUrl !== design.sessionData.originalImageUrl) {
        design.sessionData.originalImageUrl = localUrl;
        design.markModified('sessionData');
        updated = true;
      }
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
