import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Cloudinary connection configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'sample_name',
  api_key: process.env.CLOUDINARY_API_KEY || 'sample_api_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'sample_api_secret',
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'interior_design_portfolio',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1080, height: 1080, crop: 'limit' }], // Optimize resolution
    public_id: (req, file) => `${Date.now()}-${file.originalname.split('.')[0]}`,
  },
});

export const parser = multer({ storage });
export { cloudinary };
