import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

/**
 * Upload a buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from multer
 * @param {string} folder - Target folder in Cloudinary
 * @returns {Promise<string>} - The secure URL of the uploaded file
 */
export const uploadToCloudinary = (buffer, folder = 'notices') => {
  console.log(`[Cloudinary] Starting upload to folder: ${folder}...`);
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto', // Important for PDFs
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary] Upload Error:', error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
};

export default cloudinary;
