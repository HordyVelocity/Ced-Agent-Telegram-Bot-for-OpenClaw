import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();
const MAX_HISTORY = 10;

/**
 * Fetch recent conversation history for a chat
 * Returns array of { role, text, mediaSummary } in chronological order
 */
export async function getHistory(chatId, limit = MAX_HISTORY) {
  try {
    const snapshot = await db
      .collection('conversations')
      .doc(String(chatId))
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(limit * 2)
      .get();

    if (snapshot.empty) {
      console.log('📚 No history for chat ' + chatId);
      return [];
    }

    const messages = [];
    snapshot.forEach(doc => messages.push(doc.data()));
    messages.reverse();

    console.log('📚 Loaded ' + messages.length + ' history messages for chat ' + chatId);
    return messages;
  } catch (error) {
    console.error('❌ History fetch error:', error.message);
    return [];
  }
}

/**
 * Save a user message to history
 * mediaSummary examples: "[User sent a VIDEO]", "[User sent an IMAGE]", null for text
 */
export async function saveUserMessage(chatId, text, mediaSummary = null) {
  try {
    await db
      .collection('conversations')
      .doc(String(chatId))
      .collection('messages')
      .add({
        role: 'user',
        text: (text || '').substring(0, 2000),
        mediaSummary: mediaSummary || null,
        timestamp: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('❌ History save (user) error:', error.message);
  }
}

/**
 * Save an assistant response to history
 */
export async function saveAssistantMessage(chatId, text, provider = null, model = null) {
  try {
    await db
      .collection('conversations')
      .doc(String(chatId))
      .collection('messages')
      .add({
        role: 'assistant',
        text: (text || '').substring(0, 2000),
        mediaSummary: null,
        provider: provider || null,
        model: model || null,
        timestamp: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('❌ History save (assistant) error:', error.message);
  }
}
