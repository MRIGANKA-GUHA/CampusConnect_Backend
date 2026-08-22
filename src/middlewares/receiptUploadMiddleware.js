import multer from 'multer';

// Use memory storage so we have buffer access for Cloudinary & AI extraction
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Please upload an image (PNG, JPG, WEBP) or PDF receipt.'), false);
  }
};

export const receiptUpload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB limit for high-res payment screenshots
  },
  fileFilter,
});
