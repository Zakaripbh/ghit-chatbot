const config = require("../../config");

// Shared short-term conversation memory for all AI providers.
// Memory is kept in server RAM and expires automatically.
const conversations = new Map();

const MAX_TURNS = config.memory?.maxTurns || 12;
const TTL_MS =
  (config.memory?.ttlSeconds || 60 * 60 * 24) * 1000;

function getConversation(userId) {
  const existing = conversations.get(userId);

  // Create a new conversation if none exists or the old one expired.
  if (
    !existing ||
    Date.now() - existing.updatedAt > TTL_MS
  ) {
    const conversation = {
      messages: [],
      updatedAt: Date.now(),
    };

    conversations.set(userId, conversation);
    return conversation;
  }

  return existing;
}

function getMessages(userId) {
  return [...getConversation(userId).messages];
}

function addExchange(userId, userText, assistantText) {
  const conversation = getConversation(userId);

  conversation.messages.push(
    {
      role: "user",
      content: userText,
    },
    {
      role: "assistant",
      content: assistantText,
    }
  );

  // Keep only the most recent conversation turns.
  const maxMessages = MAX_TURNS * 2;

  if (conversation.messages.length > maxMessages) {
    conversation.messages.splice(
      0,
      conversation.messages.length - maxMessages
    );
  }

  conversation.updatedAt = Date.now();
}

function clearConversation(userId) {
  conversations.delete(userId);
}

module.exports = {
  getMessages,
  addExchange,
  clearConversation,
};