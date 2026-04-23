import express from 'express';
import { parser, getFileUrl } from '../services/cloudinary.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Upload multiple files
router.post('/', authenticateToken, parser.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: getFileUrl(file),
      path: file.path
    }));

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles,
      count: uploadedFiles.length
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload files',
      details: error.message 
    });
  }
});

// Upload single file
router.post('/single', authenticateToken, parser.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedFile = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: getFileUrl(req.file),
      path: req.file.path
    };

    res.json({
      message: 'File uploaded successfully',
      file: uploadedFile
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload file',
      details: error.message 
    });
  }
});

export default router;
