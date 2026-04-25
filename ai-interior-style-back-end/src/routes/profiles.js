import express from 'express';
import { User } from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { parser } from '../services/cloudinary.js';

const router = express.Router();

// Get user profile by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get additional profile data based on role
    let profileData = {
      _id: user._id,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      profile: user.profile || {},
      createdAt: user.createdAt
    };

    // If designer, add portfolio and stats
    if (user.role === 'designer') {
      const { PortfolioItem } = await import('../models/PortfolioItem.js');
      const portfolioItems = await PortfolioItem.find({ designerId: user._id })
        .sort({ createdAt: -1 })
        .limit(10);
      
      // Add follower count (will implement later)
      const followerCount = 0; // Placeholder until follow system is implemented
      
      profileData = {
        ...profileData,
        portfolioItems,
        followerCount,
        totalProjects: portfolioItems.length
      };
    }

    res.json(profileData);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile (protected)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Users can only update their own profile
    if (id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { profile } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update profile fields
    if (profile) {
      user.profile = { ...user.profile, ...profile };
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      profile: user.profile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update user profile (protected)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Users can only update their own profile
    if (id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update only provided fields
    if (updates.profile) {
      user.profile = { ...user.profile, ...updates.profile };
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      profile: user.profile
    });
  } catch (error) {
    console.error('Patch profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload profile picture (protected)
router.post('/:id/profile-picture', authenticateToken, parser.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Users can only update their own profile
    if (id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update profile picture
    user.profile = {
      ...user.profile,
      profilePicture: req.file.path,
      profilePictureCloudinaryId: req.file.filename
    };

    await user.save();

    res.json({
      message: 'Profile picture updated successfully',
      profilePicture: req.file.path
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Browse designer profiles
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      specialty, 
      verified, 
      search 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = { role: 'designer' };
    
    if (verified === 'true') {
      query.is_verified = true;
    }
    
    if (search) {
      query.$or = [
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { 'profile.company': { $regex: search, $options: 'i' } }
      ];
    }

    if (specialty) {
      query.specialty = specialty;
    }

    const designers = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get portfolio counts for each designer
    const { PortfolioItem } = await import('../models/PortfolioItem.js');
    const designerIds = designers.map(d => d._id);
    const portfolioCounts = await PortfolioItem.aggregate([
      { $match: { designerId: { $in: designerIds } } },
      { $group: { _id: '$designerId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    portfolioCounts.forEach(item => {
      countMap[item._id] = item.count;
    });

    const designersWithStats = designers.map(designer => ({
      ...designer.toObject(),
      portfolioCount: countMap[designer._id] || 0,
      followerCount: 0 // Placeholder until follow system is implemented
    }));

    const total = await User.countDocuments(query);

    res.json({
      designers: designersWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Browse designers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile (protected)
router.get('/me/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get current profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
