// ============================================
// CED BOT - PRODUCTION VERSION 1.4
// Multimodal + size limits + LAST MEDIA TRACKING
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
// Simple in-memory store: last media per chat
// ============================================
const lastMedia = new Map(); // chatId → { type, buffer, mediaType, timestamp }

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
// Message handler with multimodal support + last media memory
// ============================================
bot.on('message', async (ctx) => {
  try {
    const message = ctx.message;
    const chatId = ctx.chat.id.toString();
    const options = {};
    let userText = message.caption || message.text || '';

    // ─────────────────────────────────────────────
    // 1. Handle incoming media → store it as last media
    // ─────────────────────────────────────────────
    let mediaStored = false;

    if (message.photo && message.photo.length > 0) {
      const photo = message.photo[message.photo.length - 1];
      const buffer = await downloadFile(photo.file_id, 5 * 1024 * 1024);
      if (buffer && buffer.length > 0) {
        lastMedia.set(chatId, {
          type: 'image',
          buffer,
          mediaType: 'image/jpeg',
          timestamp: Date.now()
        });
        mediaStored = true;
      }
    }

    else if (message.voice || message.audio) {
      const audio = message.voice || message.audio;
      const buffer = await downloadFile(audio.file_id, 8 * 1024 * 1024);
      if (buffer && buffer.length > 0) {
        lastMedia.set(chatId, {
          type: 'audio',
          buffer,
          mediaType: message.voice ? 'audio/ogg' : 'audio/mpeg',
          timestamp: Date.now()
        });
        mediaStored = true;
      }
    }

    else if (message.video) {
      const buffer = await downloadFile(message.video.file_id, 10 * 1024 * 1024);
      if (buffer && buffer.length > 0) {
        if (buffer.length > 10 * 1024 * 1024) {
          await ctx.reply('This video is too large (max 10 MB). Please try a shorter clip!');
          return;
        }
        lastMedia.set(chatId, {
          type: 'video',
          buffer,
          mediaType: message.video.mime_type || 'video/mp4',
          timestamp: Date.now()
        });
        mediaStored = true;
      }
    }

    else if (message.document) {
      const doc = message.document;
      const buffer = await downloadFile(doc.file_id, 15 * 1024 * 1024);
      if (buffer && buffer.length > 0) {
        if (buffer.length > 15 * 1024 * 1024) {
          await ctx.reply('This document is too large (max 15 MB).');
          return;
        }

        let docOptions = {};
        if (doc.mime_type === 'application/pdf') {
          const pdfData = await pdfParse(buffer);
          if (pdfData.text && pdfData.text.trim().length > 0) {
            docOptions = { text: pdfData.text, type: 'pdf' };
          }
        } else {
          docOptions = { base64: buffer.toString('base64'), type: doc.mime_type };
        }

        lastMedia.set(chatId, {
          type: 'document',
          buffer,
          mediaType: doc.mime_type,
          documentOptions: docOptions,
          timestamp: Date.now()
        });
        mediaStored = true;
      }
    }

    // ─────────────────────────────────────────────
    // 2. If no media in THIS message, but user asks something → try to use last media
    // ─────────────────────────────────────────────
    if (!mediaStored && (userText || ctx.message.reply_to_message)) {
      const last = lastMedia.get(chatId);
      if (last && (Date.now() - last.timestamp < 5 * 60 * 1000)) { // 5 min memory
        if (last.type === 'image') {
          options.hasImage = true;
          options.imageData = last.buffer.toString('base64');
          options.imageMediaType = last.mediaType;
        } else if (last.type === 'video') {
          options.hasVideo = true;
          options.videoData = last.buffer.toString('base64');
          options.videoMediaType = last.mediaType;
        } else if (last.type === 'audio') {
          options.hasAudio = true;
          options.audioData = last.buffer.toString('base64');
          options.audioMediaType = last.mediaType;
        } else if (last.type === 'document') {
          options.hasDocument = true;
          if (last.documentOptions.text) {
            options.documentText = last.documentOptions.text;
            options.documentType = 'pdf';
          } else {
            options.documentData = last.buffer.toString('base64');
            options.documentType = last.mediaType;
          }
        }
      }
    }

    // Force fallback text if no text but we have media (new or remembered)
    if ((!userText || userText.trim() === '') && (options.hasImage || options.hasVideo || options.hasAudio || options.hasDocument)) {
      if (options.hasImage) userText = 'Please analyze this image.';
      else if (options.hasVideo) userText = 'Please describe and analyze this video.';
      else if (options.hasAudio) userText = 'Please transcribe this audio and respond.';
      else if (options.hasDocument) userText = 'Please read and summarize this document.';
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
      // Silent
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
