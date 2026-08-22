import { createRequire } from 'module';
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

/**
 * Upload receipt buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - MIME type
 * @param {string} studentUid - Student UID
 * @param {string} eventId - Event ID
 * @returns {Promise<string>} - Cloudinary secure URL
 */
export const uploadReceiptToCloudinary = (buffer, mimetype, studentUid, eventId) => {
  return new Promise((resolve, reject) => {
    const isPdf = mimetype === 'application/pdf';
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'campusconnect/receipts',
        public_id: `receipt_${eventId}_${studentUid}_${Date.now()}`,
        resource_type: isPdf ? 'raw' : 'image',
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary] Receipt Upload Error:', error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
};

const EXTRACTION_PROMPT = `You are an AI assistant specialized in analyzing payment screenshots and transaction receipts (UPI, NetBanking, GPay, PhonePe, Paytm, BHIM, Amazon Pay, Cred, Bank Apps).

Carefully scan this image/receipt and extract the payment details.
Look for:
1. "UPI transaction ID", "UPI Ref No", "UTR", "Transaction ID", "Google Transaction ID", "Bank reference ID", "Order ID", "Reference No".
2. The paid amount.
3. The payment app name (e.g. Google Pay, PhonePe, Paytm, BHIM, Cred, HDFC, SBI, etc.).

Return ONLY a JSON object with this exact schema (no markdown, no backticks, no extra text):
{
  "upiTransactionId": "string (12-digit numeric UTR or alphanumeric transaction ID, empty string if not found)",
  "amount": number (or null if not found),
  "paymentApp": "string (e.g. Google Pay, PhonePe, Paytm, etc. or 'Unknown')",
  "status": "SUCCESS" or "PENDING" or "FAILED" or "UNKNOWN"
}`;

const stripFences = (text) => {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
};

/**
 * Extract UPI Transaction ID and details from receipt using Gemini Vision AI
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - MIME type
 * @returns {Promise<{ upiTransactionId: string, amount: number|null, paymentApp: string, status: string }>}
 */
export const extractUpiDetailsFromReceipt = async (buffer, mimetype) => {
  try {
    let resultText = '';

    if (mimetype === 'application/pdf') {
      // PDF text extraction first
      try {
        const pdfData = await pdfParse(buffer);
        const rawText = pdfData.text || '';
        if (rawText.trim().length > 10) {
          const prompt = `${EXTRACTION_PROMPT}\n\nReceipt Text Content:\n${rawText.slice(0, 3000)}`;
          const aiRes = await geminiModel.generateContent(prompt);
          resultText = aiRes.response.text();
        }
      } catch (pdfErr) {
        console.warn('[AI] PDF parse error, falling back:', pdfErr.message);
      }
    }

    if (!resultText) {
      // Vision model on image (or PDF inline if supported)
      const mimeTypeToUse = mimetype === 'application/pdf' ? 'application/pdf' : (mimetype || 'image/jpeg');
      const imagePart = {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: mimeTypeToUse,
        },
      };

      const aiRes = await geminiModel.generateContent([EXTRACTION_PROMPT, imagePart]);
      resultText = aiRes.response.text();
    }

    const stripped = stripFences(resultText);
    const parsed = JSON.parse(stripped);

    return {
      upiTransactionId: (parsed.upiTransactionId || '').toString().trim(),
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      paymentApp: parsed.paymentApp || 'UPI',
      status: parsed.status || 'SUCCESS',
    };
  } catch (err) {
    console.error('[AI] Receipt extraction error:', err.message);
    return {
      upiTransactionId: '',
      amount: null,
      paymentApp: 'UPI',
      status: 'UNKNOWN',
    };
  }
};
