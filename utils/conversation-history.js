import { getFirestore, FieldValue } from "firebase-admin/firestore";

let db = null;

function getDb() {
  if (!db) db = getFirestore();
  return db;
}

async function ensureConversation(chatId) {
  const convoRef = getDb().collection("conversations").doc(String(chatId));
  const doc = await convoRef.get();
  if (!doc.exists) {
    await convoRef.set({
      userId: String(chatId),
      platform: "telegram",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
      messageCount: 0
    });
  }
  return convoRef;
}

function isSessionExpired(convoData) {
  if (!convoData?.lastActivityAt) return false;
  const last = convoData.lastActivityAt.toDate();
  const now = new Date();
  const diffMinutes = (now - last) / 1000 / 60;
  return diffMinutes > 1440;
}

export async function getHistory(chatId, limit = 10) {
  try {
    const convoRef = await ensureConversation(chatId);
    const convoDoc = await convoRef.get();
    const convoData = convoDoc.data();
    if (isSessionExpired(convoData)) return [];
    const snap = await convoRef.collection("messages").orderBy("timestamp", "desc").limit(limit * 2).get();
    if (snap.empty) return [];
    const messages = [];
    snap.docs.reverse().forEach(doc => {
      const d = doc.data();
      const text = d.mediaSummary ? (d.mediaSummary + " " + (d.text || "")).trim() : (d.text || "");
      if (text) messages.push({ role: d.role, text });
    });
    return messages;
  } catch { return []; }
}

export async function saveUserMessage(chatId, text, mediaSummary = null) {
  try {
    const convoRef = await ensureConversation(chatId);
    await convoRef.collection("messages").add({ role: "user", text: (text || "").substring(0, 2000), mediaSummary: mediaSummary || null, timestamp: FieldValue.serverTimestamp() });
    await convoRef.update({ lastActivityAt: FieldValue.serverTimestamp(), messageCount: FieldValue.increment(1) });
  } catch {}
}

export async function saveAssistantMessage(chatId, text, provider, model) {
  try {
    const convoRef = await ensureConversation(chatId);
    await convoRef.collection("messages").add({ role: "assistant", text: (text || "").substring(0, 2000), provider: provider || null, model: model || null, timestamp: FieldValue.serverTimestamp() });
    await convoRef.update({ lastActivityAt: FieldValue.serverTimestamp(), messageCount: FieldValue.increment(1) });
  } catch {}
}
