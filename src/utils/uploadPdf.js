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

export const deleteFromCloudinary = async (url) => {            //Delete from cloudinary function
  if (!url || !url.includes('res.cloudinary.com')) return;      // Checks the url whether its cloudinary or no url

  try {
    // Extract the path after /upload/ (removing version like v1234567890/)
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return;

    const afterUpload = url.substring(uploadIndex + 8);
    // Remove version prefix e.g. "v1785591323/"
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    // Remove file extension to get the public_id
    const publicId = withoutVersion.replace(/\.[^/.]+$/, '');

    // Determine resource_type from the URL path
    const resourceType = url.includes('/raw/upload/') ? 'raw' : 'image';

    console.log(`[Cloudinary] Deleting asset: ${publicId} (type: ${resourceType})`);
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`[Cloudinary] Delete result:`, result);
  } catch (err) {
    // Log but don't throw — a delete failure shouldn't block Firestore deletion
    console.error('[Cloudinary] Delete error:', err);
  }
};

export default cloudinary;
