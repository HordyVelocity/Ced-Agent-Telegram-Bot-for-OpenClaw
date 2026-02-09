import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { routeMessage } from './router/router.js';
import https from 'https';
import * as pdfParse from 'pdf-parse';

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

// Message handler with multimodal support
bot.on('message', async (ctx) => {
  try {
    const message = ctx.message;
    const options = {};
    
    // Handle text caption or direct text
    const userText = message.caption || message.text || '';
    
    // IMAGES
    if (message.photo && message.photo.length > 0) {
      console.log('📸 Image message detected');
      const photo = message.photo[message.photo.length - 1];
      
      const imageBuffer = await downloadFile(photo.file_id);
      console.log(`✅ Downloaded image: ${imageBuffer.length} bytes`);
      
      const base64Image = imageBuffer.toString('base64');
      console.log(`✅ Base64 encoded: ${base64Image.length} characters`);
      
      options.hasImage = true;
      options.imageData = base64Image;
      options.imageMediaType = 'image/jpeg';
      console.log('🖼️ Image data prepared for API');
    }
    
    // AUDIO / VOICE
    if (message.voice || message.audio) {
      console.log('🎤 Audio message detected');
      const audio = message.voice || message.audio;
      
      const audioBuffer = await downloadFile(audio.file_id);
      console.log(`✅ Downloaded audio: ${audioBuffer.length} bytes`);
      
      const base64Audio = audioBuffer.toString('base64');
      
      options.hasAudio = true;
      options.audioData = base64Audio;
      options.audioMediaType = message.voice ? 'audio/ogg' : 'audio/mpeg';
      console.log('🎵 Audio data prepared for API');
    }
    
    // VIDEO
    if (message.video) {
      console.log('🎬 Video message detected');
      const video = message.video;
      
      const videoBuffer = await downloadFile(video.file_id);
      console.log(`✅ Downloaded video: ${videoBuffer.length} bytes`);
      
      const base64Video = videoBuffer.toString('base64');
      
      options.hasVideo = true;
      options.videoData = base64Video;
      options.videoMediaType = 'video/mp4';
      console.log('🎥 Video data prepared for API');
    }
    
    // DOCUMENTS (including PDFs)
    if (message.document) {
      console.log('📄 Document message detected');
      const document = message.document;
      
      const docBuffer = await downloadFile(document.file_id);
      console.log(`✅ Downloaded document: ${docBuffer.length} bytes`);
      
      // Check if PDF
      if (document.mime_type === 'application/pdf') {
        console.log('📑 PDF detected - extracting text');
        try {
          const pdfData = await pdfParse(docBuffer);
          options.hasDocument = true;
          options.documentText = pdfData.text;
          options.documentType = 'pdf';
          console.log(`✅ PDF text extracted: ${pdfData.text.length} characters`);
        } catch (pdfError) {
          console.error('❌ PDF parsing error:', pdfError.message);
          options.hasDocument = true;
          options.documentText = '[PDF parsing failed]';
          options.documentType = 'pdf';
        }
      } else {
        // Other document types
        options.hasDocument = true;
        options.documentData = docBuffer.toString('base64');
        options.documentType = document.mime_type;
        console.log(`📎 Document prepared: ${document.mime_type}`);
      }
    }
    
    // Route message with options
    console.log('🚀 Routing message with options:', {
      hasImage: options.hasImage || false,
      hasAudio: options.hasAudio || false,
      hasVideo: options.hasVideo || false,
      hasDocument: options.hasDocument || false
    });
    
    const response = await routeMessage(userText, options);
    await ctx.reply(response.text);
    
  } catch (error) {
    console.error('❌ Message handling error:', error.message);
    try {
      await ctx.reply('Something went wrong on my side – try asking again!');
    } catch (replyError) {
      console.error('❌ Failed to send error message:', replyError.message);
    }
  }
});

// ============================================
// CLOUD RUN WEBHOOK MODE
// ============================================

import express from 'express';
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const WEBHOOK_PATH = '/webhook';

// Health check endpoint (required for Cloud Run)
app.get('/', (req, res) => {
    res.status(200).send({ status: 'ok', message: 'Ced Bot is running' });
});

// Webhook endpoint for Telegram
app.post(WEBHOOK_PATH, async (req, res) => {
    try {
        const update = req.body;
        console.log('📨 Webhook received:', JSON.stringify(update).substring(0, 100));
        
        // Handle the update using Telegraf
        await bot.handleUpdate(update);
        
        res.status(200).send({ ok: true });
    } catch (error) {
        console.error('❌ Webhook error:', error.message);
        res.status(500).send({ ok: false, error: error.message });
    }
});

// Initialize bot and start server
async function startBot() {
    try {
        // Initialize the bot FIRST
        await bot.init();
        console.log('🤖 Bot initialized successfully');
        
        // Start server AFTER bot is ready - FIXED: Added 0.0.0.0 host binding
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Ced Bot server running on port ${PORT}`);
            console.log(`📍 Webhook endpoint: ${WEBHOOK_PATH}`);
        });
    } catch (error) {
        console.error('❌ Bot initialization failed:', error.message);
        process.exit(1);
    }
}

// Start everything
startBot();