import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = "AIzaSyDD1PSAGPFP3kRlMtN63LlyjgYJ0UkBHLA";

if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set. AI features will not work.');
}

let genAI;
let model;

if (GEMINI_API_KEY) {

  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

export const getGeminiModel = () => {
  if (!model) {
    throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
  }
  return model;
};

export const isGeminiConfigured = () => {
  console.log(GEMINI_API_KEY)
  return !!model;
};
