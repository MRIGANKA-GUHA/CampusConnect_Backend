import express from 'express';
import { parsePdf } from '../controllers/aiController.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import pdfUpload from '../middlewares/pdfUpload.js';

const router = express.Router();

// POST /api/ai/parse-pdf
router.post('/parse-pdf', verifyToken, pdfUpload.single('pdf'), parsePdf);

export default router;
