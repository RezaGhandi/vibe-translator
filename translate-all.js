const fs = require('fs');
const path = require('path');
const axios = require('axios');

const GEMINI_API_KEY = 'AIzaSyC6nd4SfaYlQAFyBlLR9mF26Bo7MEDf9T0';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY;

const subtitles = JSON.parse(fs.readFileSync(path.join(__dirname, 'subtitles.json'), 'utf-8'));
const translated = [];

async function translateSubtitle(index) {
  const context = subtitles.filter(sub =>
    sub.index === index - 1 || sub.index === index || sub.index === index + 1
  ).map(sub => ({ index: sub.index, text: sub.text }));

  const prompt = `
You are a cinematic subtitle translator. Translate ONLY the "current" subtitle (index: 0) from any language to Persian.

CRITICAL INSTRUCTION:
The JSON array in {{CONTEXT}} contains subtitles with different indices:
- Index -1 or lower = "previous" subtitles
- Index 0 = "current" subtitle (THE ONLY ONE YOU TRANSLATE)
- Index 1 or higher = "next" subtitles

ABSOLUTE FIDELITY REQUIREMENT:
- Your translation MUST be 100% faithful to the original text
- DO NOT add ANY extra words that are not in the original
- DO NOT omit ANY words that are in the original
- Translate EXACTLY what is written, no more and no less

STRICT RULES:
1. Your ENTIRE response must contain ONLY the Persian translation of the "current" subtitle text
2. DO NOT output ANY words from "previous" or "next" subtitles
3. DO NOT reference, mention, or incorporate ANY content from adjacent subtitles
4. DO NOT output ANY explanations, formatting, or additional text

The "previous" and "next" subtitles exist ONLY for your reference to understand context.

YOUR RESPONSE MUST BE EXACTLY ONE THING: The Persian translation of ONLY the "current" subtitle text.

JSON:
${JSON.stringify(context, null, 2)}
`;

  try {
    const res = await axios.post(API_URL, {
      contents: [{ parts: [{ text: prompt }] }]
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const output = res.data.candidates?.[0]?.content?.parts?.[0]?.text;
    return output || '';
  } catch (err) {
    console.error(`خطا در ترجمه index ${index}:`, err.response?.data || err.message);
    return '';
  }
}

(async () => {
  for (let i = 0; i < subtitles.length; i++) {
    const sub = subtitles[i];
    process.stdout.write(`در حال ترجمه ${i + 1} از ${subtitles.length}...\r`);
    const translation = await translateSubtitle(sub.index);
    translated.push({
      ...sub,
      translatedText: translation
    });
  }

  fs.writeFileSync(path.join(__dirname, 'translated.json'), JSON.stringify(translated, null, 2), 'utf-8');
  console.log('\nترجمه کامل شد. فایل ذخیره شد: translated.json');
})();