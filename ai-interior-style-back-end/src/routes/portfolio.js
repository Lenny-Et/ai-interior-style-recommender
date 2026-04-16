import express from 'express';
import { parser } from '../services/cloudinary.js';
import { PortfolioItem } from '../models/PortfolioItem.js';

const router = express.Router();

router.post('/upload', parser.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const { designerId, style, colors, roomType, description } = req.body;
    
    // Process colorPalette from comma-separated string to array
    const colorPalette = colors ? colors.split(',').map(c => c.trim()) : [];

    const newItem = new PortfolioItem({
      designerId,
      imageUrl: req.file.path,
      cloudinaryId: req.file.filename,
      description,
      metadata: {
        style,
        colorPalette,
        roomType
      }
    });

    await newItem.save();
    
    res.status(201).json({
      message: 'Portfolio item uploaded successfully',
      item: newItem
    });
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

export default router;
