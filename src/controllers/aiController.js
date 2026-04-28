import { createRequire } from 'module';
import { GoogleGenerativeAI } from '@google/generative-ai';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Using gemini-2.5-flash (confirmed SUCCESS in diagnostic tests)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/** Parse a PDF buffer and return extracted text */
const parsePdfBuffer = async (buffer) => {
  const data = await pdfParse(buffer);
  return data;
};

const SYSTEM_PROMPT = `You are an AI that extracts and summarizes structured data from college campus notices.

RULES:
- title: The main heading or subject line of the notice
- content: Provide a concise, professional summary (2-4 sentences) of the notice's actual gist and action items. Do not copy the full text. Focus on the "what, where, when".
- category (pick exactly one):
    "Academic" -> exams, classes, timetable, attendance, results, curriculum
    "Event"    -> fest, competition, seminar, workshop, sports, cultural
    "Urgent"   -> urgent, immediate, emergency, deadline today, action required
    "General"  -> anything else
- priority (pick exactly one):
    "high"   -> contains urgent, immediate, ASAP, strict deadline, compulsory
    "normal" -> everything else
- targetAudience (pick exactly one):
    "students" -> specifically addresses students, scholars, learners
    "clubs"    -> mentions clubs, societies, associations, teams
    "everyone" -> general audience or not specified

Return ONLY valid JSON. No explanation. No markdown. No code fences. No extra text.
Schema: {"title":"...","content":"...","category":"...","priority":"...","targetAudience":"..."}`;

const cleanText = (raw) => {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\x20-\x7E\n]/g, '')
    .trim()
    .slice(0, 4000);
};

const stripFences = (text) => {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
};

const FALLBACK = {
  title: '',
  content: '',
  category: 'General',
  priority: 'normal',
  targetAudience: 'everyone',
};

export const parsePdf = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }

  try {
    // 1. Extract text only — No Cloudinary upload here as per user request
    const pdfContent = await parsePdfBuffer(req.file.buffer);
    const rawText = pdfContent.text;

    if (!rawText || rawText.trim().length < 20) {
      return res.status(422).json({
        error: 'Could not extract readable text from this PDF. Try a text-based notice.',
      });
    }

    const cleanedText = cleanText(rawText);
    console.log('[AI] PDF text extracted, length:', cleanedText.length);

    // 2. Generate content gist using Gemini
    const prompt = `${SYSTEM_PROMPT}\n\nNotice Content for Summarization:\n${cleanedText}`;
    const result = await model.generateContent(prompt);
    const rawResponse = result.response.text();
    
    const stripped = stripFences(rawResponse);
    let data;
    try {
      data = JSON.parse(stripped);
    } catch {
      data = { ...FALLBACK };
    }

    const VALID_CATEGORIES = ['Academic', 'Event', 'General', 'Urgent'];
    const VALID_PRIORITIES  = ['low', 'normal', 'high'];
    const VALID_AUDIENCES   = ['everyone', 'students', 'clubs'];

    const result_data = {
      title:          typeof data.title   === 'string' ? data.title.trim()   : '',
      content:        typeof data.content === 'string' ? data.content.trim() : '',
      category:       VALID_CATEGORIES.includes(data.category)      ? data.category      : 'General',
      priority:       VALID_PRIORITIES.includes(data.priority)      ? data.priority      : 'normal',
      targetAudience: VALID_AUDIENCES.includes(data.targetAudience) ? data.targetAudience : 'everyone',
    };

    return res.status(200).json(result_data);

  } catch (err) {
    console.error('[AI] parsePdf Error:', err);
    return res.status(500).json({ error: 'Failed to analyze PDF content.' });
  }
};
