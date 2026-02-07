// openclaw/ced-bot/index.js
import 'dotenv/config';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { Bot } from 'grammy';
import { routeMessage } from './router/router.js';

// Initialize Firebase Admin with ADC
let db;
try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'openclaw-pilot' // ✅ Your project ID
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
        // Don't throw - let bot continue even if save fails
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
        
        // Send error message to user
        try {
            await ctx.reply('Sorry, I encountered an error processing your message. Please try again.');
        } catch (replyError) {
            console.error('❌ Failed to send error message:', replyError.message);
        }
    }
});

// Start bot
bot.start();