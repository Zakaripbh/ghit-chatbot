const config = require("../../config");
const conversationMemory = require("../conversationMemory");
const ghitIdentity = require("./ghitIdentity");

console.log(">>> USING OPENROUTER SERVICE <<<");

async function getReply(userId, userText) {
  if (!config.openrouter.apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const history = conversationMemory.getMessages(userId);

  const messages = [
    {
      role: "system",
      content: ghitIdentity,
    },
    ...history.map(({ role, content }) => ({
      role,
      content,
    })),
    {
      role: "user",
      content: userText,
    },
  ];

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openrouter.apiKey}`,
        "HTTP-Referer": "https://ghit-health-assistant.netlify.app",
        "X-Title": "GHIT Health Assistant",
      },
      body: JSON.stringify({
        model: config.openrouter.model,
        messages,
      }),
    }
  );

  const data = await response.json();

  console.log(
    "OpenRouter Response:",
    JSON.stringify(data, null, 2)
  );

  if (!response.ok) {
    const error = new Error(JSON.stringify(data));
    error.status = response.status;
    throw error;
  }

  const reply =
    data.choices?.[0]?.message?.content ||
    "Sorry, I couldn't generate a response.";

  conversationMemory.addExchange(
    userId,
    userText,
    reply
  );

  return reply;
}

module.exports = {
  getReply,
};