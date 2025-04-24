const { addonBuilder } = require("stremio-addon-sdk");
const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyC6nd4SfaYlQAFyBlLR9mF26Bo7MEDf9T0");

const manifest = {
  "id": "org.vibe.translator",
  "version": "1.0.0",
  "name": "Persian Gemini",
  "description": "Auto Persian subtitles via Gemini",
  "resources": ["subtitles"],
  "types": ["movie"],
  "subtitles": ["fa"],
  "catalogs": [],
  "behaviorHints": {
    "configurationRequired": false
  }
};

const builder = new addonBuilder(manifest);
const app = express();
const PORT = 7001;
const BASE_URL = `http://localhost:${PORT}`;
const CACHE_DIR = path.join(__dirname, "cache");

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

const translationPrompt = `
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

TRANSLATION QUALITY REQUIREMENTS:
- Be natural and conversational in Persian, not overly formal
- Preserve all elements of the original text
- Flow smoothly so viewers can instantly understand it

The "previous" and "next" subtitles exist ONLY for your reference to understand context.

YOUR RESPONSE MUST BE EXACTLY ONE THING: The Persian translation of ONLY the "current" subtitle text.
`;

builder.defineSubtitlesHandler(async ({ id }) => {
  const imdbID = id.replace("tt", "");
  const vttPath = path.join(CACHE_DIR, `${imdbID}.vtt`);
  const vttUrl = `${BASE_URL}/cache/${imdbID}.vtt`;

  if (!fs.existsSync(vttPath)) {
    console.log("→ Fetching subtitle for:", id);
    const yifyPage = await fetch(`https://yifysubtitles.ch/movie-imdb/${id}`);
    const html = await yifyPage.text();
    const match = html.match(/href="(\/subtitle\/.+?\.zip)"/);
    if (!match) return { subtitles: [] };

    const zipUrl = `https://yifysubtitles.ch${match[1]}`;
    const zipRes = await fetch(zipUrl);
    const zipBuffer = await zipRes.buffer();

    const zipPath = path.join(CACHE_DIR, `${imdbID}.zip`);
    fs.writeFileSync(zipPath, zipBuffer);

    let srtContent = "";
    await fs.createReadStream(zipPath)
      .pipe(unzipper.ParseOne())
      .on("data", (chunk) => { srtContent += chunk.toString(); });

    // تبدیل SRT به array of lines
    const lines = srtContent.split("\n").map(l => l.trim()).filter(l => l && !/^\d+$/.test(l) && !/^\d\d:\d\d:\d\d,/.test(l));
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      const context = [
        { index: -1, text: lines[i - 1] || "" },
        { index: 0, text: lines[i] },
        { index: 1, text: lines[i + 1] || "" }
      ];

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const res = await model.generateContent([
        { role: "user", parts: [{ text: translationPrompt.replace("{{CONTEXT}}", JSON.stringify(context, null, 2)) }] }
      ]);

      const translated = res.response.text().trim();
      result.push({ original: lines[i], translated });
    }

    const vttLines = ["WEBVTT\n"];
    let time = 0;

    for (let i = 0; i < result.length; i++) {
      const start = new Date(time * 1000).toISOString().substr(11, 8) + ".000";
      const end = new Date((time + 3) * 1000).toISOString().substr(11, 8) + ".000";
      vttLines.push(`${i + 1}`, `${start} --> ${end}`, result[i].translated, "");
      time += 3;
    }

    fs.writeFileSync(vttPath, vttLines.join("\n"));
    console.log("✅ Subtitle translated & saved:", vttPath);
  }

  return {
    subtitles: [
      {
        id: "fa-gemini",
        lang: "fa",
        label: "fa (Gemini)",
        url: vttUrl
      }
    ]
  };
});

app.use("/cache", express.static(CACHE_DIR));
app.get("/manifest.json", (req, res) => res.json(builder.getInterface().manifest));
app.get("/", (req, res) => res.send("Stremio Subtitle Addon"));

app.listen(PORT, () => {
  console.log(`✅ Server is running at ${BASE_URL}`);
});