// ============================================
// CED BOT - PRODUCTION VERSION 1.3
// Full multimodal + size limits + fallback text
// Last updated: 2026-02-10
// ============================================

import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import https from 'https';
import express from 'express';
import pdfParse from 'pdf-parse';
import { routeMessage } from './router/router.js';

config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// ============================================
// Download file helper (with timeout & size limit)
// ============================================
async function downloadFile(fileId, maxSizeBytes = 20 * 1024 * 1024, timeoutMs = 30000) {
  try {
    const file = await bot.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        req.destroy();
        reject(new Error('Download timeout exceeded'));
      }, timeoutMs);

      const req = https.get(fileUrl, (res) => {
        if (res.statusCode !== 200) {
          clearTimeout(timeout);
          reject(new Error(`Download failed: ${res.statusCode}`));
          return;
        }

        const contentLength = parseInt(res.headers['content-length'] || '0', 10);
        if (contentLength > maxSizeBytes) {
          clearTimeout(timeout);
          res.destroy();
          reject(new Error(`File too large: ${contentLength} bytes (max ${maxSizeBytes})`));
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          clearTimeout(timeout);
          resolve(Buffer.concat(chunks));
        });
        res.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      req.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  } catch (err) {
    throw new Error(`Download failed: ${err.message}`);
  }
}

// ============================================
// Message handler with multimodal support
// ============================================
bot.on('message', async (ctx) => {
  try {
    const message = ctx.message;
    const options = {};
    let userText = message.caption || message.text || '';

    // IMAGES
    if (message.photo && message.photo.length > 0) {
      const photo = message.photo[message.photo.length - 1];
      const imageBuffer = await downloadFile(photo.file_id, 5 * 1024 * 1024); // 5 MB max
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Empty image buffer');
      }
      options.hasImage = true;
      options.imageData = imageBuffer.toString('base64');
      options.imageMediaType = 'image/jpeg';
    }

    // AUDIO / VOICE
    if (message.voice || message.audio) {
      const audio = message.voice || message.audio;
      const audioBuffer = await downloadFile(audio.file_id, 8 * 1024 * 1024); // 8 MB max
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Empty audio buffer');
      }
      options.hasAudio = true;
      options.audioData = audioBuffer.toString('base64');
      options.audioMediaType = message.voice ? 'audio/ogg' : 'audio/mpeg';
    }

    // VIDEO
    if (message.video) {
      const videoBuffer = await downloadFile(message.video.file_id, 10 * 1024 * 1024); // 10 MB max
      if (videoBuffer.length > 10 * 1024 * 1024) {
        await ctx.reply('This video is too large (max 10 MB). Please try a shorter clip!');
        return;
      }
      if (!videoBuffer || videoBuffer.length === 0) {
        throw new Error('Empty video buffer');
      }
      options.hasVideo = true;
      options.videoData = videoBuffer.toString('base64');
      options.videoMediaType = message.video.mime_type || 'video/mp4';
    }

    // DOCUMENTS
    if (message.document) {
      const doc = message.document;
      const docBuffer = await downloadFile(doc.file_id, 15 * 1024 * 1024); // 15 MB max

      if (docBuffer.length > 15 * 1024 * 1024) {
        await ctx.reply('This document is too large (max 15 MB).');
        return;
      }

      if (!docBuffer || docBuffer.length === 0) {
        throw new Error('Empty document buffer');
      }

      if (doc.mime_type === 'application/pdf') {
        const pdfData = await pdfParse(docBuffer);
        if (!pdfData.text || pdfData.text.trim().length === 0) {
          throw new Error('PDF content empty or unreadable');
        }
        options.hasDocument = true;
        options.documentText = pdfData.text;
        options.documentType = 'pdf';
      } else {
        options.hasDocument = true;
        options.documentData = docBuffer.toString('base64');
        options.documentType = doc.mime_type;
      }
    }

    // Force fallback text if no caption but media present
    if (!userText) {
      if (options.hasImage) userText = 'Please analyze this image';
      else if (options.hasVideo) userText = 'Please analyze this video';
      else if (options.hasAudio) userText = 'Please transcribe and respond to this audio';
      else if (options.hasDocument) userText = 'Please analyze this document';
    }

    // Skip if nothing useful
    if (!userText && !Object.values(options).some(v => !!v)) {
      return;
    }

    // Route to AI logic
    const response = await routeMessage(userText, options);

    await ctx.reply(response.text || 'Got it!');

  } catch (error) {
    console.error('Message handler error:', error);
    try {
      await ctx.reply('Sorry, something went wrong on my side. Try asking again!');
    } catch {
      // Silent fail
    }
  }
});

// ============================================
// EXPRESS WEBHOOK SERVER FOR CLOUD RUN
// ============================================
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const WEBHOOK_PATH = '/webhook';

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Ced Bot is running' });
});

// Telegram webhook
app.post(WEBHOOK_PATH, async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Start server
async function startBot() {
  try {
    await bot.telegram.getMe();
    app.listen(PORT, '0.0.0.0', () => {
      // Server running silently
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

startBot();
