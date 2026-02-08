// openclaw/ced-bot/index.js
import 'dotenv/config';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { Bot } from 'grammy';
import { routeMessage } from './router/router.js';
import express from 'express';
import https from 'https';

// Initialize Firebase Admin with ADC
let db;
try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'openclaw-pilot'
        });
    }
    db = getFirestore();
    console.log('🔥 Firebase initialized');
} catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    process.exit(1);
}

// Save message to Firestore
async function saveMessage(chatId, userMessage, aiResponse, provider, model) {
    try {
        const messageData = {
            chatId: String(chatId),
            userMessage: userMessage,
            aiResponse: aiResponse,
            provider: provider,
            model: model,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('messages').add(messageData);
        console.log('✅ Message saved to Firestore:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('❌ Failed to save to Firestore:', error.message);
        return null;
    }
}

// Initialize Telegram bot
const bot = new Bot(process.env.TELEGRAM_TOKEN);

console.log('⚡ Ced bot with OpenClaw routing active');

// Handle incoming messages
bot.on('message', async (ctx) => {
    const userId = String(ctx.from.id);
    
    // ========================================
    // NEW: Media handling (images/audio/video)
    // ========================================
    if (!ctx.message.text) {
        let userMessage = '';
        let options = {};
        
        if (ctx.message.photo) {
            // Image message - download and encode
            userMessage = ctx.message.caption || 'Analyze this image';
            
            try {
                // Get the largest photo size
                const photo = ctx.message.photo[ctx.message.photo.length - 1];
                const file = await ctx.api.getFile(photo.file_id);
                
                // Download the image using https module
                const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;
                
                // Download with https (works in all Node versions)
                const imageBuffer = await new Promise((resolve, reject) => {
                    const chunks = [];
                    https.get(fileUrl, (response) => {
                        response.on('data', (chunk) => chunks.push(chunk));
                        response.on('end', () => resolve(Buffer.concat(chunks)));
                        response.on('error', reject);
                    }).on('error', reject);
                });
                
                const base64Image = imageBuffer.toString('base64');
                
                options = {
                    hasImage: true,
                    imageContext: 'Telegram image',
                    imageData: base64Image,
                    imageMediaType: 'image/jpeg'
                };
                
                console.log('📸 Image downloaded and encoded');
            } catch (error) {
                console.error('❌ Image download error:', error.message);
                await ctx.reply('Sorry, I had trouble downloading the image. Please try again.');
                return;
            }
            
        } else if (ctx.message.voice || ctx.message.audio) {
            userMessage = ctx.message.caption || 'Transcribe this audio';
            options = { hasAudio: true, audioContext: 'Telegram audio' };
            console.log('🎤 Audio received (transcription not yet implemented)');
        } else if (ctx.message.video) {
            userMessage = ctx.message.caption || 'Analyze this video';
            options = { hasVideo: true, videoContext: 'Telegram video' };
            console.log('🎥 Video received (analysis not yet implemented)');
        } else {
            await ctx.reply('I can handle text, images, audio, and video.');
            return;
        }
        
        try {
            const result = await routeMessage(userMessage, options);
            if (!result || !result.text) throw new Error('Empty response');
            await ctx.reply(result.text);
            await saveMessage(userId, userMessage, result.text, result.provider || 'unknown', result.model || 'unknown');
            return;
        } catch (error) {
            console.error('❌ Media error:', error.message);
            await ctx.reply('Sorry, error processing media. Please try again.');
            return;
        }
    }
    
    // ========================================
    // EXISTING: Text handling (UNCHANGED)
    // ========================================
    const userMessage = ctx.message.text;

    try {
        console.log('📨 Incoming:', userMessage);
        
        const result = await routeMessage(userMessage);
        
        if (!result || !result.text) {
            throw new Error('Empty response from router');
        }

        await ctx.reply(result.text);
        console.log('✅ Response sent to Telegram');

        await saveMessage(
            userId,
            userMessage,
            result.text,
            result.provider || 'unknown',
            result.model || 'unknown'
        );

    } catch (error) {
        console.error('❌ Error processing message:', error.message);
        
        try {
            await ctx.reply('Sorry, I encountered an error processing your message. Please try again.');
        } catch (replyError) {
            console.error('❌ Failed to send error message:', replyError.message);
        }
    }
});

// ============================================
// CLOUD RUN WEBHOOK MODE
// ============================================

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
        
        // Handle the update using grammY
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
        console.