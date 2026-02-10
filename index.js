// ============================================
// CED BOT - PRODUCTION VERSION 1.1
// Clean - No Console Statements
// ============================================

import Anthropic from '@
cat > ~/Documents/A-\ \(ClawdBot\)\ -\ OpenClaw\ Project/openclaw-installer/openclaw/ced-bot/index.js << 'ENDOFFILE'
// ============================================
// CED BOT - PRODUCTION VERSION 1.1
// Clean - No Console Statements
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import Telegraf from 'telegraf';
import fetch from 'node-fetch';
import admin from 'firebase-admin';
import * as pdfParse from 'pdf-parse';
import { routeMessage } from './router/router.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!ANTHROPIC_API_KEY || !TELEGRAM_BOT_TOKEN) {
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

async function downloadFile(fileId) {
  const fileUrl = await bot.telegram.getFileLink(fileId);
  const response = await fetch(fileUrl.href);
  const buffer = await response.buffer();
  return buffer;
}

async function saveToFirestore(chatId, role, content) {
  try {
    await db.collection('conversations').add({
      chatId: chatId.toString(),
      role,
      content,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Silent failure - logging optional
  }
}

bot.on('message', async (ctx) => {
  const message = ctx.message;
  const chatId = message.chat.id;
  const userName = message.from.first_name || message.from.username || 'User';

  const options = {
    hasImage: false,
    hasAudio: false,
    hasVideo: false,
    hasDocument: false,
    imageData: null,
    imageMediaType: null,
    audioData: null,
    videoData: null,
    videoMediaType: null,
    documentData: null,
    documentType: null,
  };

  let userMessage = message.text || '';

  try {
    // IMAGE HANDLING
    if (message.photo && message.photo.length > 0) {
      try {
        const photo = message.photo[message.photo.length - 1];
        const imageBuffer = await downloadFile(photo.file_id);
        
        if (!imageBuffer || imageBuffer.length === 0) {
          throw new Error('Failed to download image');
        }
        
        const base64Image = imageBuffer.toString('base64');
        
        options.hasImage = true;
        options.imageData = base64Image;
        options.imageMediaType = 'image/jpeg';
        
        userMessage = message.caption || 'Please analyze this image';
      } catch (imageError) {
        await ctx.reply('⚠️ Failed to process image. Please try again.');
        return;
      }
    }

    // AUDIO HANDLING
    if (message.voice) {
      try {
        const voiceBuffer = await downloadFile(message.voice.file_id);
        
        if (!voiceBuffer || voiceBuffer.length === 0) {
          throw new Error('Failed to download voice message');
        }
        
        const base64Audio = voiceBuffer.toString('base64');
        
        options.hasAudio = true;
        options.audioData = base64Audio;
        
        userMessage = 'Please transcribe and respond to this voice message';
      } catch (audioError) {
        await ctx.reply('⚠️ Failed to process voice message. Please try again.');
        return;
      }
    }

    // VIDEO HANDLING
    if (message.video) {
      try {
        const videoBuffer = await downloadFile(message.video.file_id);
        
        if (!videoBuffer || videoBuffer.length === 0) {
          throw new Error('Failed to download video');
        }
        
        const base64Video = videoBuffer.toString('base64');
        
        options.hasVideo = true;
        options.videoData = base64Video;
        options.videoMediaType = message.video.mime_type || 'video/mp4';
        
        userMessage = message.caption || 'Please analyze this video';
      } catch (videoError) {
        await ctx.reply('⚠️ Failed to process video. Please try again.');
        return;
      }
    }

    // DOCUMENT HANDLING
    if (message.document && message.document.mime_type !== 'application/pdf') {
      try {
        const docBuffer = await downloadFile(message.document.file_id);
        
        if (!docBuffer || docBuffer.length === 0) {
          throw new Error('Failed to download document');
        }
        
        const base64Doc = docBuffer.toString('base64');
        
        options.hasDocument = true;
        options.documentData = base64Doc;
        options.documentType = message.document.mime_type;
        
        userMessage = message.caption || 'Please analyze this document';
      } catch (docError) {
        await ctx.reply('⚠️ Failed to process document. Please try again.');
        return;
      }
    }

    if (!userMessage && !options.hasImage && !options.hasAudio && !options.hasVideo && !options.hasDocument) {
      return;
    }

    await saveToFirestore(chatId, 'user', userMessage);

    const response = await routeMessage(userMessage, options);
    
    await ctx.reply(response.text);

    await saveToFirestore(chatId, 'assistant', response.text);

  } catch (error) {
    try {
      await ctx.reply('⚠️ Sorry, I encountered an error. Please try again.');
    } catch (replyError) {
      // Silent failure
    }
  }
});

import express from 'express';
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const WEBHOOK_PATH = '/webhook';

app.get('/', (req, res) => {
  res.status(200).send({ status: 'ok', message: 'Ced Bot is running' });
});

app.post(WEBHOOK_PATH, async (req, res) => {
  try {
    const update = req.body;
    
    await bot.handleUpdate(update);
    
    res.status(200).send({ ok: true });
  } catch (error) {
    res.status(500).send({ ok: false, error: error.message });
  }
});

async function startBot() {
  try {
    await bot.telegram.getMe();
    
    app.listen(PORT, '0.0.0.0', () => {
      // Server running
    });
  } catch (error) {
    process.exit(1);
  }
}

startBot();
