const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const subtitlePageURL = 'https://yifysubtitles.ch/subtitles/the-matrix-1999-english-yify-119099';

async function downloadSubtitleFromDirectLink() {
  try {
    console.log('در حال ورود به صفحه زیرنویس...');
    const res = await axios.get(subtitlePageURL);
    const $ = cheerio.load(res.data);

    const zipPathRelative = $('a[href$=".zip"]').attr('href');
    if (!zipPathRelative) throw new Error('لینک فایل ZIP پیدا نشد.');

    const zipURL = new URL(zipPathRelative, subtitlePageURL).href;
    console.log('در حال دانلود فایل ZIP از:', zipURL);

    const zipRes = await fetch(zipURL);
    if (!zipRes.ok || !zipRes.body) throw new Error(`دانلود ناموفق: ${zipRes.status}`);

    const zipPath = path.join(__dirname, 'subtitle.zip');
    const srtPath = path.join(__dirname, 'matrix.en.srt');

    const fileStream = fs.createWriteStream(zipPath);
    await new Promise((resolve, reject) => {
      zipRes.body.pipe(fileStream);
      zipRes.body.on('error', reject);
      fileStream.on('finish', resolve);
    });

    const zip = new AdmZip(zipPath);
    const srtEntry = zip.getEntries().find(e => e.entryName.endsWith('.srt'));
    if (!srtEntry) throw new Error('فایل SRT داخل ZIP پیدا نشد.');

    const srtText = srtEntry.getData().toString('utf-8');
    fs.writeFileSync(srtPath, srtText);

    console.log('فایل SRT با موفقیت ذخیره شد: matrix.en.srt');

  } catch (err) {
    console.error('خطا:', err.message);
  }
}

downloadSubtitleFromDirectLink();