// Simple in-memory session store (per chat)
const sessions = new Map();

/**
 * Get conversation history for a chat
 */
export function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, []);
  }
  return sessions.get(chatId);
}

/**
 * Add a message to the session
 */
export function addToSession(chatId, role, content) {
  const session = getSession(chatId);
  session.push({ role, content });

  // Keep memory manageable (last 20 messages)
  if (session.length > 20) {
    session.shift();
  }
}

/**
 * Clear session memory
 */
export function clearSession(chatId) {
  sessions.delete(chatId);
}