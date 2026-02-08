// openclaw/ced-bot/index.js
import 'dotenv/config';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { Bot } from 'grammy';
import { routeMessage } from './router/router.js';
import express from 'express';

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
    const userMessage = ctx.message.text;
    const userId = String(ctx.from.id);

    try {
        console.log('📨 Incoming:', userMessage);
        
        // Route message through OpenClaw
        const result = await routeMessage(userMessage);
        
        if (!result || !result.text) {
            throw new Error('Empty response from router');
        }

        // Send response to Telegram
        await ctx.reply(result.text);
        console.log('✅ Response sent to Telegram');

        // Save to Firestore (non-blocking)
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
        console.log('🤖 Bot initialized successfully');
        
        // Start server AFTER bot is ready
        app.listen(PORT, () => {
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