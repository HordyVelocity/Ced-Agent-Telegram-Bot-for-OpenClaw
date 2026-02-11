// --------------------------------------------------
// SAVE ASSISTANT MESSAGE
// --------------------------------------------------
export async function saveAssistantMessage(chatId, text, provider, model) {
  try {
    const convoRef = await ensureConversation(chatId);

    await convoRef.collection("messages").add({
      role: "assistant",
      text: (text || "").substring(0, 2000),
      provider: provider || null,
      model: model || null,
      timestamp: FieldValue.serverTimestamp()
    });

    await convoRef.update({
      lastActivityAt: FieldValue.serverTimestamp(),
      messageCount: FieldValue.increment(1)
    });

  } catch (error) {
    console.error("Save assistant msg error:", error.message);
  }
}