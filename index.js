import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { routeMessage } from './router/router.js';
import https from 'https';
import express from 'express';

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

// Main message handler
bot.on('message', async (ctx) => {
  try {
    const message = ctx.message;
    const options = {};
    const userText = message.caption || message.text || '';

    // Images
    if (message.photo && message.photo.length > 0) {
      console.log('📸 Image received');
      const photo = message.photo[message.photo.length - 1]; // highest resolution
      const imageBuffer = await downloadFile(photo.file_id);
      const base64Image = imageBuffer.toString('base64');
      
      options.hasImage = true;
      options.imageData = base64Image;
      options.imageMediaType = 'image/jpeg';
      console.log(`Image prepared (${imageBuffer.length} bytes)`);
    }

    // Voice / Audio
    if (message.voice || message.audio) {
      console.log('🎤 Audio received');
      const audio = message.voice || message.audio;
      const audioBuffer = await downloadFile(audio.file_id);
      const base64Audio = audioBuffer.toString('base64');
      
      options.hasAudio = true;
      options.audioData = base64Audio;
      options.audioMediaType = message.voice ? 'audio/ogg' : 'audio/mpeg';
      console.log(`Audio prepared (${audioBuffer.length} bytes)`);
    }

    // Video
    if (message.video) {
      console.log('🎬 Video received');
      const videoBuffer = await downloadFile(message.video.file_id);
      const base64Video = videoBuffer.toString('base64');
      
      options.hasVideo = true;
      options.videoData = base64Video;
      options.videoMediaType = 'video/mp4';
      console.log(`Video prepared (${videoBuffer.length} bytes)`);
    }

    // Documents (only non-PDF for now – safe)
    if (message.document && message.document.mime_type !== 'application/pdf') {
      console.log('📎 Document received (non-PDF)');
      const docBuffer = await downloadFile(message.document.file_id);
      options.hasDocument = true;
      options.documentData = docBuffer.toString('base64');
      options.documentType = message.document.mime_type;
      console.log(`Document prepared (${docBuffer.length} bytes)`);
    }

    // Route to your logic
    console.log('Routing message with options:', {
      hasImage: !!options.hasImage,
      hasAudio: !!options.hasAudio,
      hasVideo: !!options.hasVideo,
      hasDocument: !!options.hasDocument
    });

    const response = await routeMessage(userText, options);
    await ctx.reply(response.text || 'Got it!');

  } catch (error) {
    console.error('❌ Message handler error:', error.message);
    try {
      await ctx.reply('Sorry, something went wrong on my side. Try again?');
    } catch (replyErr) {
      console.error('Could not send error reply:', replyErr.message);
    }
  }
});

// ────────────────────────────────────────────────
//           EXPRESS + WEBHOOK for Cloud Run
// ────────────────────────────────────────────────

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const WEBHOOK_PATH = '/webhook';

// Health check endpoint (Cloud Run requires this)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Ced Bot is running',
    timestamp: new Date().toISOString()
  });
});

// Telegram webhook endpoint
app.post(WEBHOOK_PATH, async (req, res) => {
  try {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2).slice(0, 200) + '...');
    await bot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Start the bot + server
async function startBot() {
  try {
    await bot.init();
    console.log('🤖 Telegraf bot initialized successfully');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server listening on port ${PORT}`);
      console.log(`Webhook path: ${WEBHOOK_PATH}`);
      console.log(`Health check: http://0.0.0.0:${PORT}/`);
    });
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    process.exit(1);
  }
}

// Launch everything
startBot();