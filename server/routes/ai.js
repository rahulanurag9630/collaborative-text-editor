import express from 'express';
import { getGeminiModel, isGeminiConfigured } from '../config/gemini.js';
import { authenticate } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticate);
router.use(aiLimiter);

const textValidation = [
  body('text').isString().isLength({ min: 1, max: 5000 }).withMessage('Text must be between 1 and 5000 characters'),
  validate,
];

router.post('/grammar-check', textValidation, async (req, res) => {
  try {
    if (!isGeminiConfigured()) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    const { text } = req.body;
    const model = getGeminiModel();

    const prompt = `Check the following text for grammar, spelling, and style issues. Provide specific suggestions for improvement in a clear, concise format. If there are no issues, say so.

Text: "${text}"

Format your response as a JSON array of suggestions, where each suggestion has: "issue", "suggestion", and "position" (approximate location in text). If no issues, return an empty array.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    res.json({
      suggestions: responseText,
      originalText: text,
    });
  } catch (error) {
    console.error('Grammar check error:', error);
    res.status(500).json({ error: 'Failed to check grammar' });
  }
});

router.post('/enhance', textValidation, async (req, res) => {
  try {
    if (!isGeminiConfigured()) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    const { text } = req.body;
    const model = getGeminiModel();

    const prompt = `Improve the following text to make it clearer, more professional, and more engaging while maintaining its original meaning and tone:

"${text}"

Provide only the enhanced version without explanations.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const enhancedText = response.text().trim();

    res.json({
      enhancedText,
      originalText: text,
    });
  } catch (error) {
    console.error('Text enhancement error:', error);
    res.status(500).json({ error: 'Failed to enhance text' });
  }
});

router.post('/summarize', textValidation, async (req, res) => {
  try {
    if (!isGeminiConfigured()) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    const { text } = req.body;
    const model = getGeminiModel();

    const prompt = `Provide a concise summary of the following text in 2-3 sentences:

"${text}"

Provide only the summary without any preamble.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text().trim();

    res.json({
      summary,
      originalText: text,
    });
  } catch (error) {
    console.error('Summarization error:', error);
    res.status(500).json({ error: 'Failed to summarize text' });
  }
});

router.post('/complete', async (req, res) => {
  try {
    if (!isGeminiConfigured()) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    const { text, context = '' } = req.body;

    if (!text || text.length < 1 || text.length > 500) {
      return res.status(400).json({ error: 'Text must be between 1 and 500 characters' });
    }

    const model = getGeminiModel();

    const prompt = `Given the following context and incomplete text, provide a natural completion (1-2 sentences maximum):

Context: "${context}"
Incomplete text: "${text}"

Provide only the completion text that would naturally follow, without repeating the original text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const completion = response.text().trim();

    res.json({
      completion,
      originalText: text,
    });
  } catch (error) {
    console.error('Text completion error:', error);
    res.status(500).json({ error: 'Failed to complete text' });
  }
});

router.post('/suggestions', async (req, res) => {
  try {
    if (!isGeminiConfigured()) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    const { text, topic = '' } = req.body;

    if (!text || text.length < 1 || text.length > 1000) {
      return res.status(400).json({ error: 'Text must be between 1 and 1000 characters' });
    }

    const model = getGeminiModel();

    const topicContext = topic ? `The document is about: ${topic}.` : '';
    const prompt = `Given the following text from a document, provide 3-5 helpful writing suggestions or ideas for what to write next. ${topicContext}

Current text: "${text}"

Provide suggestions as a simple numbered list.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const suggestions = response.text().trim();

    res.json({
      suggestions,
      originalText: text,
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

export default router;
