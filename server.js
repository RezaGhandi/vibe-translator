const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = 3000;

const config = {
  apiKey: 'AIzaSyC6nd4SfaYlQAFyBlLR9mF26Bo7MEDf9T0',
  model: 'gemini-2.0-flash',
  apiVersion: 'v1beta'
};

function buildPrompt(contextJson) {
  return `You are a cinematic subtitle translator. Translate ONLY the "current" subtitle (index: 0) from any language to Persian.

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

TRANSLATION QUALITY REQUIREMENTS:
- Be natural and conversational in Persian, not overly formal
- Preserve all elements of the original text
- Flow smoothly so viewers can instantly understand it

The "previous" and "next" subtitles exist ONLY for your reference to understand context.

YOUR RESPONSE MUST BE EXACTLY ONE THING: The Persian translation of ONLY the "current" subtitle text.

Example:
If "current" subtitle (index: 0) contains ONLY "I love you" - your ENTIRE output must be ONLY "دوستت دارم"

Any response that contains extra words or content from adjacent subtitles is INCORRECT and will be rejected.

{{CONTEXT}}:
${contextJson}
`;
}

app.post('/translate', async (req, res) => {
  const { context } = req.body;
  if (!context) return res.status(400).json({ error: 'Missing subtitle context' });

  const prompt = buildPrompt(context);

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/${config.apiVersion}/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ translation: reply || '[No translation received]' });

  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: 'Translation failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Gemini 2.0 subtitle translator server running at http://localhost:${PORT}`);
});