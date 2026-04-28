import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

/**
 * Upload a profile picture to Cloudinary with face-detection cropping
 * @param {Buffer} buffer - Image buffer from multer
 * @param {string} userId - The user's UID to use as public_id
 * @returns {Promise<string>} - The secure URL of the cropped profile picture
 */
export const uploadProfilePic = (buffer, userId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "campusconnect/profiles",
        public_id: `user_${userId}`,
        overwrite: true,
        resource_type: "image",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary] Profile Pic Upload Error:', error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
};

export default cloudinary;
