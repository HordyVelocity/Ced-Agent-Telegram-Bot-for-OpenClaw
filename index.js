// ======================================================
// CedVelocityLeadsBot – CLEAN LIVE VERSION
// Location: openclaw/ced-bot/index.js
// ======================================================

import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import Anthropic from '@anthropic-ai/sdk';

// ENV
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!TELEGRAM_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN missing');
  process.exit(1);
}

if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY missing');
  process.exit(1);
}

console.log('Token loaded');
console.log('Starting CedVelocityLeadsBot');

// Claude client
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

// Telegram bot
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('Ced is running and polling');

// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    'Hello. I am Ced. Ask me anything.'
  );
});

// Messages
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  console.log('Message:', text);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [
        { role: 'user', content: text }
      ],
    });

    const reply = response.content[0].text;
    await bot.sendMessage(chatId, reply);

  } catch (err) {
    console.error('Handler error:', err.message);
    await bot.sendMessage(chatId, 'Error processing request.');
  }
});

// Polling errors
bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

// Shutdown
process.on('SIGINT', () => {
  bot.stopPolling();
  process.exit(0);
});

