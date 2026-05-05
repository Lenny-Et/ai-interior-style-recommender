import express from 'express';
import { parser, getFileUrl } from '../services/cloudinary.js';
import { PortfolioItem } from '../models/PortfolioItem.js';

const router = express.Router();

// GET - Fetch portfolio items for a designer
router.get('/', async (req, res) => {
  try {
    const { designerId, page = 1, limit = 20, status, style, roomType } = req.query;
    
    if (!designerId) {
      return res.status(400).json({ error: 'Designer ID is required' });
    }

    // Build query
    const query = { designerId };
    
    // For development, skip designer validation to allow portfolio testing
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== undefined) {
      const { User } = await import('../models/User.js');
      const designer = await User.findById(designerId);
      if (!designer) {
        return res.status(404).json({ error: 'Designer not found' });
      }
    }
    
    // Add filters if provided
    if (status) {
      // Note: PortfolioItem doesn't have status field, but we can simulate it
      // This might need to be added to the model if needed
    }
    if (style) {
      query['metadata.style'] = style;
    }
    if (roomType) {
      query['metadata.roomType'] = roomType;
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [items, total] = await Promise.all([
      PortfolioItem.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('designerId', 'email profile.firstName profile.lastName'),
      PortfolioItem.countDocuments(query)
    ]);

    res.json({
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching portfolio items:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio items' });
  }
});

// GET - Single portfolio item
router.get('/:id', async (req, res) => {
  try {
    const item = await PortfolioItem.findById(req.params.id)
      .populate('designerId', 'email profile.firstName profile.lastName');
    
    if (!item) {
      return res.status(404).json({ error: 'Portfolio item not found' });
    }

    res.json({ item });
  } catch (error) {
    console.error('Error fetching portfolio item:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio item' });
  }
});

// POST - Upload portfolio item (existing)
router.post('/upload', parser.single('image'), async (req, res) => {
  try {
    console.log('Portfolio upload request received:', {
      hasFile: !!req.file,
      body: req.body
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' });
    }

    const { designerId, style, colors, roomType, description, title } = req.body;

    // Validate required fields
    if (!designerId) {
      return res.status(400).json({ error: 'Designer ID is required' });
    }
    
    if (!style) {
      return res.status(400).json({ error: 'Style is required' });
    }
    
    if (!roomType) {
      return res.status(400).json({ error: 'Room type is required' });
    }

    // For development, skip designer validation to allow portfolio testing
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== undefined) {
      const { User } = await import('../models/User.js');
      const designer = await User.findById(designerId);
      if (!designer) {
        return res.status(404).json({ error: 'Designer not found' });
      }
    }
    
    // Process colorPalette from comma-separated string to array
    const colorPalette = colors ? colors.split(',').map(c => c.trim()) : [];

    const newItem = new PortfolioItem({
      designerId,
      imageUrl: getFileUrl(req.file),
      cloudinaryId: req.file.filename || req.file.originalname,
      description,
      metadata: {
        style,
        colorPalette,
        roomType,
        title: title || 'Untitled Design'
      }
    });

    await newItem.save();
    
    res.status(201).json({
      message: 'Portfolio item uploaded successfully',
      item: newItem
    });
  } catch (error) {
    console.error('Portfolio upload error:', {
      error: error.message,
      stack: error.stack,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file received',
      body: req.body
    });
    
    // Provide more specific error messages
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field' });
    } else if (error.message && error.message.includes('Cloudinary')) {
      return res.status(500).json({ error: 'Cloudinary upload failed. Please try again.' });
    } else {
      res.status(500).json({ error: 'Failed to upload image: ' + (error.message || 'Unknown error') });
    }
  }
});

// PUT - Update portfolio item
router.put('/:id', async (req, res) => {
  try {
    const { description, metadata } = req.body;
    
    const item = await PortfolioItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Portfolio item not found' });
    }

    // Update fields
    if (description !== undefined) {
      item.description = description;
    }
    
    if (metadata) {
      if (metadata.style) item.metadata.style = metadata.style;
      if (metadata.colorPalette) item.metadata.colorPalette = metadata.colorPalette;
      if (metadata.roomType) item.metadata.roomType = metadata.roomType;
      if (metadata.title) item.metadata.title = metadata.title;
    }

    await item.save();
    
    res.json({
      message: 'Portfolio item updated successfully',
      item
    });
  } catch (error) {
    console.error('Error updating portfolio item:', error);
    res.status(500).json({ error: 'Failed to update portfolio item' });
  }
});

// PATCH - Toggle featured status
router.patch('/:id/featured', async (req, res) => {
  try {
    const { featured } = req.body;
    
    const item = await PortfolioItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Portfolio item not found' });
    }

    // Note: PortfolioItem doesn't have a featured field, we might need to add it
    // For now, we'll simulate it by adding to metadata
    if (!item.metadata) {
      item.metadata = {};
    }
    item.metadata.featured = featured !== undefined ? featured : !item.metadata.featured;

    await item.save();
    
    res.json({
      message: 'Featured status updated successfully',
      item
    });
  } catch (error) {
    console.error('Error updating featured status:', error);
    res.status(500).json({ error: 'Failed to update featured status' });
  }
});

// DELETE - Remove portfolio item
router.delete('/:id', async (req, res) => {
  try {
    const item = await PortfolioItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Portfolio item not found' });
    }

    // TODO: Also delete from Cloudinary using cloudinaryId
    // This would require importing the cloudinary service
    
    await PortfolioItem.findByIdAndDelete(req.params.id);
    
    res.json({
      message: 'Portfolio item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting portfolio item:', error);
    res.status(500).json({ error: 'Failed to delete portfolio item' });
  }
});

export default router;
