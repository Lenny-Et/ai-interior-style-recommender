import express from 'express';
import { InspirationPost } from '../models/InspirationPost.js';
import { Like } from '../models/Like.js';
import { Save } from '../models/Save.js';
import { Follow } from '../models/Follow.js';
import { authenticateToken } from '../middleware/auth.js';
import { parser, getFileUrl } from '../services/cloudinary.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Helper to check auth without requiring it
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return next();

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return next();
    req.user = user;
    next();
  });
};

// Get community inspiration feed (homeowner posts)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 20, style, roomType } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    if (style) query['metadata.style'] = style;
    if (roomType) query['metadata.roomType'] = roomType;

    const posts = await InspirationPost.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'profile role')
      .lean();

    // Get likes, saves and follows
    const postIds = posts.map(p => p._id);
    
    let likedIds = new Set();
    let savedIds = new Set();
    let followedUserIds = new Set();
    
    if (userId) {
      const [likes, saves, follows] = await Promise.all([
        Like.find({ userId, targetType: 'inspiration', targetId: { $in: postIds } }),
        Save.find({ userId, targetType: 'inspiration', targetId: { $in: postIds } }),
        Follow.find({ followerId: userId })
      ]);
      likedIds = new Set(likes.map(l => l.targetId.toString()));
      savedIds = new Set(saves.map(s => s.targetId.toString()));
      followedUserIds = new Set(follows.map(f => f.followingId.toString()));
    }

    const transformedPosts = posts.map(post => {
      const postObj = post;
      const authorId = post.userId?._id?.toString() || post.userId?.toString();
      
      return {
        ...postObj,
        isLiked: likedIds.has(post._id.toString()),
        isSaved: savedIds.has(post._id.toString()),
        userId: {
          ...(postObj.userId?.toObject ? postObj.userId.toObject() : postObj.userId),
          isFollowing: followedUserIds.has(authorId)
        }
      };
    });

    const total = await InspirationPost.countDocuments(query);

    res.json({
      posts: transformedPosts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get inspiration posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new inspiration post (Homeowners only or all authenticated users)
router.post('/', authenticateToken, parser.single('image'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { description, style, roomType, title, tags } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const imageUrl = getFileUrl(req.file);
    const cloudinaryId = req.file.filename;

    const post = new InspirationPost({
      userId,
      imageUrl,
      cloudinaryId,
      description,
      isApproved: true, // Auto-approve community posts
      approvedAt: new Date(),
      metadata: {
        style: style || 'Modern',
        roomType: roomType || 'Living Room',
        title: title || 'Inspiration',
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : []
      }
    });

    await post.save();
    await post.populate('userId', 'profile role');

    res.status(201).json({ 
      message: 'Inspiration shared with the community!', 
      post 
    });
  } catch (error) {
    console.error('Create inspiration post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's own inspiration posts
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const posts = await InspirationPost.find({ userId }).sort({ createdAt: -1 });
    res.json({ posts });
  } catch (error) {
    console.error('Get my inspiration posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an inspiration post
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { description, metadata } = req.body;

    const post = await InspirationPost.findOne({ _id: req.params.id });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Authorization: owner or admin
    if (post.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (description !== undefined) post.description = description;
    if (metadata) {
      if (metadata.style) post.metadata.style = metadata.style;
      if (metadata.roomType) post.metadata.roomType = metadata.roomType;
      if (metadata.title) post.metadata.title = metadata.title;
      if (metadata.tags) post.metadata.tags = metadata.tags;
    }

    // Auto-approve on update as well
    post.isApproved = true;
    post.approvedAt = new Date();
    post.rejectedAt = undefined;
    post.rejectionReason = undefined;
    post.editRequestedAt = undefined;
    post.editRequestNote = undefined;

    await post.save();
    res.json({ message: 'Inspiration post updated successfully', post });
  } catch (error) {
    console.error('Update inspiration post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an inspiration post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const postId = req.params.id;

    const post = await InspirationPost.findOne({ _id: postId, userId });
    if (!post) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    // Note: In a real app, we should also delete the image from Cloudinary here
    await InspirationPost.findByIdAndDelete(postId);

    res.json({ message: 'Inspiration post deleted successfully' });
  } catch (error) {
    console.error('Delete inspiration post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
