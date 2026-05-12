import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Check if Cloudinary is properly configured
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'sample_name' &&
  process.env.CLOUDINARY_API_KEY !== 'sample_api_key';

let storage;

if (isCloudinaryConfigured) {
  // Use Cloudinary if properly configured
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'interior_design_portfolio',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1080, height: 1080, crop: 'limit' }],
      public_id: (req, file) => `${Date.now()}-${file.originalname.split('.')[0]}`,
    },
  });
} else {
  // Fallback to local storage for development
  console.warn('Cloudinary not configured. Using local storage fallback.');
  
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname.split('.')[0]}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });
}

export const parser = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
    }
  }
});
export { cloudinary };

// Helper function to get file URL
export const getFileUrl = (file) => {
  if (isCloudinaryConfigured && file.path) {
    return file.path; // Cloudinary URL
  } else if (file.filename) {
    // Local file URL (for development)
    return `http://localhost:5000/uploads/${file.filename}`;
  }
  return file.path || '';
};
