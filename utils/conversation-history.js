import { getFirestore } from "firebase-admin/firestore";

let db = null;
function getDb() {
  if (!db) db = getFirestore();
  return db;
}

export async function getHistory(chatId, limit = 10) {
  try {
    const snap = await getDb()
      .collection("conversations")
      .doc(String(chatId))
      .collection("messages")
      .orderBy("timestamp", "desc")
      .limit(limit * 2)
      .get();

    if (snap.empty) {
      console.log("No conversation history for chat", chatId);
      return [];
    }

    const messages = [];
    snap.docs.reverse().forEach(doc => {
      const d = doc.data();
      const text = d.mediaSummary ? (d.mediaSummary + " " + (d.text || "")).trim() : (d.text || "");
      if (text) messages.push({ role: d.role, text });
    });

    console.log("Loaded " + messages.length + " history messages for chat " + chatId);
    return messages;
  } catch (error) {
    console.error("History fetch error:", error.message);
    return [];
  }
}

export async function saveUserMessage(chatId, text, mediaSummary = null) {
  try {
    await getDb()
      .collection("conversations")
      .doc(String(chatId))
      .collection("messages")
      .add({
        role: "user",
        text: (text || "").substring(0, 2000),
        mediaSummary: mediaSummary || null,
        timestamp: new Date()
      });
  } catch (error) {
    console.error("Save user msg error:", error.message);
  }
}

export async function saveAssistantMessage(chatId, text, provider, model) {
  try {
    await getDb()
      .collection("conversations")
      .doc(String(chatId))
      .collection("messages")
      .add({
        role: "assistant",
        text: (text || "").substring(0, 2000),
        provider: provider || null,
        model: model || null,
        timestamp: new Date()
      });
  } catch (error) {
    console.error("Save assistant msg error:", error.message);
  }
}
