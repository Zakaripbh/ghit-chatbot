const config = require("../../config");
const conversationMemory = require("../conversationMemory");
const ghitIdentity = require("./ghitIdentity");

console.log(">>> USING GROQ SERVICE <<<");

async function getReply(userId, userText) {
  if (!config.groq.apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
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
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.groq.apiKey}`,
      },
      body: JSON.stringify({
        model: config.groq.model,
        messages,
      }),
    }
  );

  const data = await response.json();

  console.log("Groq Response:", JSON.stringify(data, null, 2));

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