import express from 'express';
import { Telegraf } from 'telegraf';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { route } from './router/router.js';
import https from 'https';

// Initialize Firebase
initializeApp();
const db = getFirestore();
console.log('🔥 Firebase initialized');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(TOKEN);

// EXPRESS WEBHOOK SERVER FOR CLOUD RUN
// ===================================================
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

// Handle text messages
bot.on('text', async (ctx) => {
  const message = ctx.message.text;
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name || 'Unknown';

  console.log('📩 Message:', { message, username });

  try {
    const response = await route(message);
    await ctx.reply(response);

    // Save to Firestore
    await db.collection('messages').add({
      chatId,
      userId,
      username,
      message,
      response,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Error:', error);
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
});

// Handle photos
bot.on('photo', async (ctx) => {
  const message = ctx.message.caption || '';
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name || 'Unknown';

  console.log('📷 Photo received:', { message, username });

  try {
    // Get the highest resolution photo
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    
    // Download the photo
    const file = await ctx.telegram.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
    
    // Download image as buffer
    const imageBuffer = await new Promise((resolve, reject) => {
      https.get(fileUrl, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
    });

    // Route with image
    const response = await route(message || 'Please analyze this image', {
      hasImage: true,
      imageData: imageBuffer.toString('base64'),
      imageMediaType: 'image/jpeg'
    });

    await ctx.reply(response);

    // Save to Firestore
    await db.collection('messages').add({
      chatId,
      userId,
      username,
      message,
      response,
      hasImage: true,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Photo error:', error);
    await ctx.reply('Sorry, I had trouble processing that image. Please try again.');
  }
});

// Handle videos
bot.on('video', async (ctx) => {
  const message = ctx.message.caption || '';
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name || 'Unknown';

  console.log('🎥 Video received:', { message, username });

  try {
    const video = ctx.message.video;
    const file = await ctx.telegram.getFile(video.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
    
    // Download video as buffer
    const videoBuffer = await new Promise((resolve, reject) => {
      https.get(fileUrl, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
    });

    // Route with video
    const response = await route(message || 'Please analyze this video', {
      hasVideo: true,
      videoData: videoBuffer.toString('base64'),
      videoMediaType: 'video/mp4'
    });

    await ctx.reply(response);

    // Save to Firestore
    await db.collection('messages').add({
      chatId,
      userId,
      username,
      message,
      response,
      hasVideo: true,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Video error:', error);
    await ctx.reply('Sorry, I had trouble processing that video. Please try again.');
  }
});

// Handle audio/voice
bot.on(['audio', 'voice'], async (ctx) => {
  const message = ctx.message.caption || '';
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name || 'Unknown';

  console.log('🎵 Audio received:', { message, username });

  try {
    const audio = ctx.message.audio || ctx.message.voice;
    const file = await ctx.telegram.getFile(audio.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
    
    // Download audio as buffer
    const audioBuffer = await new Promise((resolve, reject) => {
      https.get(fileUrl, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
    });

    // Route with audio
    const response = await route(message || 'Please transcribe this audio', {
      hasAudio: true,
      audioData: audioBuffer.toString('base64'),
      audioMediaType: ctx.message.voice ? 'audio/ogg' : 'audio/mpeg'
    });

    await ctx.reply(response);

    // Save to Firestore
    await db.collection('messages').add({
      chatId,
      userId,
      username,
      message,
      response,
      hasAudio: true,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Audio error:', error);
    await ctx.reply('Sorry, I had trouble processing that audio. Please try again.');
  }
});

// Handle documents
bot.on('document', async (ctx) => {
  const message = ctx.message.caption || '';
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name || 'Unknown';

  console.log('📄 Document received:', { message, username });

  try {
    const document = ctx.message.document;
    const file = await ctx.telegram.getFile(document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
    
    // Download document as buffer
    const docBuffer = await new Promise((resolve, reject) => {
      https.get(fileUrl, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
    });

    // Route with document
    const response = await route(message || 'Please analyze this document', {
      hasDocument: true,
      documentData: docBuffer.toString('base64'),
      documentMediaType: document.mime_type || 'application/pdf'
    });

    await ctx.reply(response);

    // Save to Firestore
    await db.collection('messages').add({
      chatId,
      userId,
      username,
      message,
      response,
      hasDocument: true,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Document error:', error);
    await ctx.reply('Sorry, I had trouble processing that document. Please try again.');
  }
});

// Start server
async function startBot() {
  try {
    // CRITICAL: Start listening on port FIRST before any Telegram API calls
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Ced Agent online on port ${PORT}`);
    });
    
    // Then verify Telegram connection
    await bot.telegram.getMe();
    console.log('✅ Telegram connection verified');
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

startBot();