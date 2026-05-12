import express from 'express';
import { Board } from '../models/Board.js';
import { Save } from '../models/Save.js';
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
      .populate({
        path: 'userId',
        select: 'profile.firstName profile.lastName'
      });

    const total = await Board.countDocuments({ userId });

    // Get save counts for each board
    const boardsWithCounts = await Promise.all(
      boards.map(async (board) => {
        const saveCount = await Save.countDocuments({
          targetType: 'board',
          targetId: board._id
        });
        
        // Get sample items for the board (portfolio items saved to this board)
        const sampleItems = await Save.find({
          targetType: 'portfolio',
          userId: userId
        })
        .populate({
          path: 'targetId',
          select: 'imageUrl metadata style roomType'
        })
        .limit(3);

        return {
          ...board.toObject(),
          saveCount,
          sampleItems: sampleItems.map(save => save.targetId).filter(item => item)
        };
      })
    );

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
    const { name, description, tags, isPublic, coverImage } = req.body;

    const board = await Board.findOne({ _id: boardId, userId });
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (name) board.name = name;
    if (description !== undefined) board.description = description;
    if (tags !== undefined) board.tags = tags;
    if (isPublic !== undefined) board.isPublic = isPublic;
    if (coverImage !== undefined) board.coverImage = coverImage;

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

    // Create a save record linking the item to the board
    const save = new Save({
      userId,
      targetType,
      targetId
    });

    await save.save();

    res.status(201).json({ message: 'Item added to board successfully' });
  } catch (error) {
    console.error('Add item to board error:', error);
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

    await Save.findOneAndDelete({
      userId,
      targetId: itemId
    });

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
      targetType: 'portfolio'
    })
    .populate({
      path: 'targetId',
      select: 'imageUrl description metadata designerId createdAt'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

    const items = saves
      .map(save => save.targetId)
      .filter(item => item); // Filter out null items

    const total = await Save.countDocuments({
      userId,
      targetType: 'portfolio'
    });

    res.json({
      items,
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
