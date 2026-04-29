import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'sample_name',
  api_key: process.env.CLOUDINARY_API_KEY || 'sample_api_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'sample_api_secret',
});

// Use memory storage (no temp files)
const storage = multer.memoryStorage();

// Multer middleware
export const parser = multer({ storage });

// Function to upload image to Cloudinary
export const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'interior_design_portfolio',
          resource_type: 'image',
          transformation: [
            { width: 1080, height: 1080, crop: 'limit' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      )
      .end(fileBuffer);
  });
};

export { cloudinary };