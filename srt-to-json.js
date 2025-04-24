const fs = require('fs');
const path = require('path');

const srtPath = path.join(__dirname, 'matrix.en.srt');
const outputPath = path.join(__dirname, 'subtitles.json');

function parseSRT(data) {
  const blocks = data.split('\n\n');
  const results = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      const index = parseInt(lines[0]);
      const time = lines[1].trim();
      const text = lines.slice(2).join(' ').trim();

      const [startTime, endTime] = time.split(' --> ');

      results.push({
        index,
        startTime,
        endTime,
        text
      });
    }
  }

  return results;
}

const srtContent = fs.readFileSync(srtPath, 'utf-8');
const parsed = parseSRT(srtContent);
fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2), 'utf-8');

console.log(`تبدیل کامل شد. فایل JSON ساخته شد: ${outputPath}`);