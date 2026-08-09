const config = require("../../config");

console.log(">>> USING REST GEMINI SERVICE <<<");

// Short-term, per-user conversation memory.
// Conversations are kept only in server memory and expire after 30 minutes.
const conversations = new Map();

const MAX_TURNS = 10;
const SESSION_TTL_MS = 30 * 60 * 1000;

function getHistory(userId) {
  const existing = conversations.get(userId);

  if (!existing || Date.now() - existing.updatedAt > SESSION_TTL_MS) {
    const history = {
      messages: [],
      updatedAt: Date.now(),
    };

    conversations.set(userId, history);
    return history;
  }

  return existing;
}

async function getReply(userId, userText) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;

  const history = getHistory(userId);

  const contents = history.messages.map(({ role, text }) => ({
    role,
    parts: [{ text }],
  }));

  // Add the current user message.
  contents.push({
    role: "user",
    parts: [{ text: userText }],
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
    }),
  });

  const data = await response.json();

  console.log("Gemini Response:", JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  const reply =
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Sorry, I couldn't generate a response.";

  // Save the successful exchange.
  history.messages.push(
    {
      role: "user",
      text: userText,
    },
    {
      role: "model",
      text: reply,
    }
  );

  // Keep only the most recent 10 conversation turns.
  const maxMessages = MAX_TURNS * 2;

  if (history.messages.length > maxMessages) {
    history.messages.splice(
      0,
      history.messages.length - maxMessages
    );
  }

  history.updatedAt = Date.now();

  return reply;
}

module.exports = {
  getReply,
};
