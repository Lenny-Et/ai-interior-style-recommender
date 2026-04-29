import express from 'express';
import { parser, uploadToCloudinary } from '../services/cloudinary.js';
import { PortfolioItem } from '../models/PortfolioItem.js';

const router = express.Router();

router.post('/upload', parser.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const { designerId, style, colors, roomType, description } = req.body;

    // Convert colors string → array
    const colorPalette = colors
      ? colors.split(',').map(c => c.trim())
      : [];

    // ✅ Upload to Cloudinary manually
    const result = await uploadToCloudinary(req.file.buffer);

    // ✅ Save to MongoDB
    const newItem = new PortfolioItem({
      designerId,
      imageUrl: result.secure_url,     // ✅ correct URL
      cloudinaryId: result.public_id,  // ✅ correct ID
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
    console.error('Error uploading:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

export default router;