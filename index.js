// openclaw/ced-bot/index.js
import 'dotenv/config';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { Bot } from 'grammy';
import { routeMessage } from './router/router.js';
import express from 'express';
import https from 'https';

// ============================================
// 1. FIREBASE INITIALIZATION
// ============================================
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

// ============================================
// 2. FIRESTORE UTILITIES
// ============================================
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

// ============================================
// 3. IMAGE DOWNLOAD HELPER
// ============================================
async function downloadImageAsBase64(fileUrl) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        
        https.get(fileUrl, (response) => {
            // Check for successful response
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            
            response.on('data', (chunk) => {
                chunks.push(chunk);
                console.log(`📥 Downloaded ${chunks.length} chunks...`);
            });
            
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                console.log(`✅ Download complete: ${buffer.length} bytes`);
                resolve(buffer.toString('base64'));
            });
            
            response.on('error', (err) => {
                console.error('❌ Response error:', err.message);
                reject(err);
            });
        }).on('error', (err) => {
            console.error('❌ Request error:', err.message);
            reject(err);
        });
    });
}

// ============================================
// 4. BOT LOGIC (TEXT & MEDIA)
// ============================================
const bot = new Bot(process.env.TELEGRAM_TOKEN);

bot.on('message', async (ctx) => {
    const userId = String(ctx.from.id);
    let userMessage = ctx.message.text || '';
    let options = {};

    // Check for Photos
    if (ctx.message.photo) {
        userMessage = ctx.message.caption || 'Analyze this image';
        
        console.log('🖼️ Image message detected');
        
        try {
            // Get the largest photo
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            console.log(`📸 Photo file_id: ${photo.file_id}`);
            
            // Get file info from Telegram
            const file = await ctx.api.getFile(photo.file_id);
            console.log(`📁 File path: ${file.file_path}`);
            
            // Build download URL
            const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;
            console.log(`🔗 Download URL ready`);
            
            // Download and encode
            const base64Image = await downloadImageAsBase64(fileUrl);
            console.log(`✅ Base64 encoding complete: ${base64Image.length} chars`);

            options = {
                hasImage: true,
                imageContext: 'Telegram image',
                imageData: base64Image,
                imageMediaType: 'image/jpeg'
            };
            
            console.log('📸 Image processed for AI Vision');
            console.log(`📦 Options object ready with imageData`);
            
        } catch (error) {
            console.error('❌ Image download error:', error.message);
            console.error('❌ Stack:', error.stack);
            await ctx.reply('Sorry, I had trouble downloading that image. Please try again.');
            return;
        }
    }

    // Process Message via Router
    try {
        console.log('📨 Incoming:', userMessage);
        console.log('📝 Options:', JSON.stringify({
            hasImage: options.hasImage || false,
            hasImageData: !!options.imageData,
            imageDataLength: options.imageData ? options.imageData.length : 0
        }));
        
        const result = await routeMessage(userMessage, options);
        
        if (!result || !result.text) throw new Error('Empty response from AI');

        await ctx.reply(result.text);
        await saveMessage(userId, userMessage, result.text, result.provider, result.model);
        
    } catch (error) {
        console.error('❌ Processing Error:', error.message);
        await ctx.reply('Sorry, I encountered an error. Please try again.');
    }
});

// ============================================
// 5. CLOUD RUN ENGINE ROOM (EXPRESS)
// ============================================
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Health check (Required for Cloud Run)
app.get('/', (req, res) => {
    res.status(200).send({ status: 'ok', message: 'Ced Bot Active in Sydney' });
});

// Telegram Webhook Listener
app.post('/webhook', async (req, res) => {
    try {
        await bot.handleUpdate(req.body);
        res.status(200).send({ ok: true });
    } catch (error) {
        console.error('❌ Webhook error:', error.message);
        res.status(500).send({ ok: false });
    }
});

// Initialize and Start
async function startBot() {
    try {
        await bot.init();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Ced Agent online on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
    }
}

startBot();