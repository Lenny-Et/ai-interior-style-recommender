import express from 'express';
import mongoose from 'mongoose';
import { Board } from '../models/Board.js';
import { Save } from '../models/Save.js';
import { InspirationPost } from '../models/InspirationPost.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all boards for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const boards = await Board.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean for faster performance

    const total = await Board.countDocuments({ userId });

    // Optimization: Get save counts for all boards in one query
    const boardSaveCounts = await Save.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), boardId: { $exists: true } } },
      { $group: { _id: '$boardId', count: { $sum: 1 } } }
    ]);

    // Create a map for quick lookup
    const countsMap = boardSaveCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    // Get sample items for each board efficiently
    const boardsWithCounts = await Promise.all(boards.map(async (board) => {
      const saveCount = countsMap[board._id.toString()] || 0;
      const totalCount = saveCount + (board.items?.length || 0);
      
      // Get up to 3 sample items for this specific board
      const portfolioSaves = await Save.find({
        userId,
        boardId: board._id,
        targetType: 'portfolio'
      })
      .populate({
        path: 'targetId',
        select: 'imageUrl metadata style roomType'
      })
      .limit(3)
      .lean();

      const portfolioSamples = portfolioSaves.map(save => save.targetId).filter(item => item);
      const aiSamples = (board.items || []).slice(0, 3).map(item => ({
        _id: item._id,
        imageUrl: item.imageUrl,
        metadata: { style: item.style, roomType: item.roomType, description: item.description },
        source: 'ai_recommendation'
      }));
      
      const combinedSamples = [...aiSamples, ...portfolioSamples].slice(0, 3);

      return {
        ...board,
        saveCount: totalCount,
        sampleItems: combinedSamples
      };
    }));

    res.json({
      boards: boardsWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new board
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, tags, isPublic, coverImage } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Board name is required' });
    }

    const board = new Board({
      userId,
      name,
      description,
      tags: tags || [],
      isPublic: isPublic || false,
      coverImage
    });

    await board.save();
    await board.populate({
      path: 'userId',
      select: 'profile.firstName profile.lastName'
    });

    res.status(201).json({ board });
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a board
router.put('/:boardId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { boardId } = req.params;
    const { name, description, tags, isPublic, coverImage, colorPalette } = req.body;

    const board = await Board.findOne({ _id: boardId, userId });
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (name) board.name = name;
    if (description !== undefined) board.description = description;
    if (tags !== undefined) board.tags = tags;
    if (isPublic !== undefined) board.isPublic = isPublic;
    if (coverImage !== undefined) board.coverImage = coverImage;
    // Allow saving an empty array (user cleared the palette) or a new set of colours
    if (colorPalette !== undefined) board.colorPalette = colorPalette;

    await board.save();
    await board.populate({
      path: 'userId',
      select: 'profile.firstName profile.lastName'
    });

    res.json({ board });
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a board
router.delete('/:boardId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { boardId } = req.params;

    const board = await Board.findOne({ _id: boardId, userId });
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    // Remove all saves associated with this board
    await Save.deleteMany({
      $or: [
        { targetType: 'board', targetId: boardId },
        { userId: userId, targetType: 'portfolio' } // Remove portfolio saves from this user's boards
      ]
    });

    await Board.findByIdAndDelete(boardId);

    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to board
router.post('/:boardId/items', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { boardId } = req.params;
    const { targetType, targetId } = req.body;

    if (!targetType || !targetId) {
      return res.status(400).json({ error: 'Target type and ID are required' });
    }

    const board = await Board.findOne({ _id: boardId, userId });
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    // Check if already saved to this specific board
    const existingSave = await Save.findOne({ userId, boardId, targetType, targetId });
    if (existingSave) {
      return res.status(400).json({ error: 'Item already saved to this board' });
    }

    // Create a save record linking the item to the board
    const save = new Save({
      userId,
      boardId,
      targetType,
      targetId
    });

    await save.save();

    // Increment saves count for inspiration posts
    if (targetType === 'inspiration') {
      await InspirationPost.findByIdAndUpdate(targetId, { $inc: { savesCount: 1 } });
    }

    res.status(201).json({ message: 'Item added to board successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'This item is already saved to your boards' });
    }
    console.error('Add item to board error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add AI item to board
router.post('/:boardId/ai-items', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { boardId } = req.params;
    const { imageUrl, name, style, roomType, description } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const board = await Board.findOne({ _id: boardId, userId });
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    // Check if already in this board
    const exists = board.items.some(item => item.imageUrl === imageUrl);
    if (exists) {
      return res.status(400).json({ error: 'This design is already saved to this board' });
    }

    // Add to embedded items array
    board.items.push({
      imageUrl,
      name,
      style,
      roomType,
      description,
      source: 'ai_recommendation'
    });

    await board.save();

    res.status(201).json({ message: 'AI item added to board successfully', board });
  } catch (error) {
    console.error('Add AI item to board error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove item from board
router.delete('/:boardId/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { boardId, itemId } = req.params;

    const board = await Board.findOne({ _id: boardId, userId });
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    // Try removing from embedded items first
    const itemIndex = board.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex > -1) {
      board.items.splice(itemIndex, 1);
      await board.save();
    } else {
      // If not embedded, remove from Save collection
      await Save.findOneAndDelete({
        userId,
        targetId: itemId
      });
    }

    res.json({ message: 'Item removed from board successfully' });
  } catch (error) {
    console.error('Remove item from board error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get items in a board
router.get('/:boardId/items', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { boardId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const board = await Board.findOne({ _id: boardId, userId });
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const saves = await Save.find({
      userId,
      boardId,
      targetType: 'portfolio'
    })
    .populate({
      path: 'targetId',
      select: 'imageUrl description metadata designerId createdAt'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

    const portfolioItems = saves
      .map(save => save.targetId)
      .filter(item => item); // Filter out null items

    // Format embedded AI items to match the expected shape
    const aiItems = (board.items || []).map(item => ({
      _id: item._id,
      imageUrl: item.imageUrl,
      metadata: { style: item.style, roomType: item.roomType, description: item.description },
      source: item.source,
      createdAt: item.addedAt
    }));

    // Combine and sort
    const allItems = [...aiItems, ...portfolioItems].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Manual pagination for combined items
    const paginatedItems = allItems.slice(skip, skip + limitNum);

    const total = allItems.length;

    res.json({
      items: paginatedItems,
      board,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get board items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
