import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { routeMessage } from './router/router.js';
import https from 'https';

config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Helper: Download file from Telegram
async function downloadFile(fileId) {
  try {
    const file = await bot.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    
    return new Promise((resolve, reject) => {
      https.get(fileUrl, (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  } catch (error) {
    console.error('❌ File download error:', error.message);
    throw error;
  }
}

// Message handler with multimodal support (IMAGES + AUDIO + VIDEO ready)
bot.on('message', async (ctx) => {
  try {
    const message = ctx.message;
    const options = {};
    const userText = message.caption || message.text || '';

    // === IMAGES (WORKING PERFECTLY) ===
    if (message.photo && message.photo.length > 0) {
      console.log('📸 Image received');
      const photo = message.photo[message.photo.length - 1]; // highest res
      const imageBuffer = await downloadFile(photo.file_id);
      const base64Image = imageBuffer.toString('base64');
      
      options.hasImage = true;
      options.imageData = base64Image;
      options.imageMediaType = 'image/jpeg';
    }

    // === VOICE / AUDIO (framework ready) ===
    if (message.voice || message.audio) {
      console.log('🎤 Audio received');
      const audio = message.voice || message.audio;
      const audioBuffer = await downloadFile(audio.file_id);
      const base64Audio = audioBuffer.toString('base64');
      
      options.hasAudio = true;
      options.audioData = base64Audio;
      options.audioMediaType = message.voice ? 'audio/ogg' : 'audio/mpeg';
    }

    // === VIDEO (framework ready) ===
    if (message.video) {
      console.log('🎬 Video received');
      const videoBuffer = await downloadFile(message.video.file_id);
      const base64Video = videoBuffer.toString('base64');
      
      options.hasVideo = true;
      options.videoData = base64Video;
      options.videoMediaType = 'video/mp4';
    }

    // === DOCUMENTS (non-PDF only – safe) ===
    if (message.document && message.document.mime_type !== 'application/pdf') {
      console.log('📎 Non-PDF document received');
      const docBuffer = await downloadFile(message.document.file_id);
      options.hasDocument = true;
      options.documentData = docBuffer.toString('base64');
      options.documentType = message.document.mime_type;
    }

    const response = await routeMessage(userText, options);
    await ctx.reply(response.text);

  } catch (error) {
    console.error('❌ Message handling error:', error.message);
    try {
      await ctx.reply('Something went wrong – try again in a sec!');
    } catch {}
  }
});

// =============== EXPRESS WEBHOOK SERVER ===============
import express from 'express';
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Health check
app.get('/', (req, res) => {
  res.status(200).send({ status: 'ok', message: 'Ced Bot is alive and crushing it' });
});

// Telegram webhook
app.post('/webhook', async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send({ error: error.message });
  }
});

// Start everything
async function startBot() {
  try {
    await bot.init();
    console.log('🤖 Telegraf bot initialized');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Ced Bot server LIVE on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

startBot();