const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'translated.json');
const outputPath = path.join(__dirname, 'output.vtt');

function srtTimeToVttTime(srtTime) {
  return srtTime.replace(',', '.');
}

const subtitles = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

let vtt = 'WEBVTT\n\n';

subtitles.forEach(sub => {
  if (!sub.translatedText) return; // رد کردن خطوط خالی یا ترجمه نشده

  vtt += `${sub.index}\n`;
  vtt += `${srtTimeToVttTime(sub.startTime)} --> ${srtTimeToVttTime(sub.endTime)}\n`;
  vtt += `${sub.translatedText}\n\n`;
});

fs.writeFileSync(outputPath, vtt, 'utf-8');
console.log('فایل VTT ساخته شد: output.vtt');