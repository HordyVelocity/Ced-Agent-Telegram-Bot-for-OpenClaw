import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { routeMessage } from './router/router.js';
import https from 'https';
import pdfParse from 'pdf-parse';

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
      options.audioMediaType = message.voice ? 'audio/ogg' : (audio.mime_type || 'audio/mpeg');
      options.audioDuration = audio.duration;
      console.log('🎵 Audio data prepared for API');
    }
    
    // VIDEO
    if (message.video || message.video_note) {
      console.log('🎥 Video message detected');
      const video = message.video || message.video_note;
      
      const videoBuffer = await downloadFile(video.file_id);
      console.log(`✅ Downloaded video: ${videoBuffer.length} bytes`);
      
      const base64Video = videoBuffer.toString('base64');
      
      options.hasVideo = true;
      options.videoData = base64Video;
      options.videoMediaType = video.mime_type || 'video/mp4';
      options.videoDuration = video.duration;
      console.log('📹 Video data prepared for API');
    }
    
    // DOCUMENTS (PDF, etc)
    if (message.document) {
      console.log('📄 Document detected');
      const doc = message.document;
      
      const docBuffer = await downloadFile(doc.file_id);
      console.log(`✅ Downloaded document: ${docBuffer.length} bytes`);
      
      // If PDF, extract text
      if (doc.mime_type === 'application/pdf') {
        try {
          const pdfData = await pdfParse(docBuffer);
          options.hasDocument = true;
          options.documentText = pdfData.text;
          options.documentName = doc.file_name;
          options.documentPages = pdfData.numpages;
          console.log(`📖 PDF text extracted: ${pdfData.text.length} characters, ${pdfData.numpages} pages`);
        } catch (pdfError) {
          console.error('⚠️ PDF parsing failed:', pdfError.message);
          options.hasDocument = true;
          options.documentText = '[PDF text extraction failed]';
          options.documentName = doc.file_name;
        }
      } else {
        // For other documents, just note the file
        options.hasDocument = true;
        options.documentName = doc.file_name;
        options.documentType = doc.mime_type;
        console.log(`📎 Document noted: ${doc.file_name}`);
      }
    }
    
    // Build message for routing
    let finalMessage = userText;
    
    // Add context hints for non-text content
    if (!userText && options.hasImage) {
      finalMessage = 'Analyze this image';
    } else if (!userText && options.hasAudio) {
      finalMessage = 'What is in this audio?';
    } else if (!userText && options.hasVideo) {
      finalMessage = 'What is in this video?';
    } else if (!userText && options.hasDocument) {
      finalMessage = `Analyze this document: ${options.documentName}`;
    }
    
    console.log(`💬 Routing message with options:`, {
      hasImage: options.hasImage || false,
      hasAudio: options.hasAudio || false,
      hasVideo: options.hasVideo || false,
      hasDocument: options.hasDocument || false,
      textLength: finalMessage.length
    });
    
    // Route to AI
    const response = await routeMessage(finalMessage, options);
    
    // Send response
    await ctx.reply(response.text, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('❌ Message handling error:', error);
    await ctx.reply('Sorry, something went wrong processing your message. Please try again.');
  }
});

// Start bot
bot.launch()
  .then(() => console.log('✅ Ced bot started successfully'))
  .catch(err => console.error('❌ Bot launch error:', err));

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));