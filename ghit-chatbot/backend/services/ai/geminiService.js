const config = require("../../config");
const conversationMemory = require("../conversationMemory");
const ghitIdentity = require("./ghitIdentity");

console.log(">>> USING REST GEMINI SERVICE <<<");

async function getReply(userId, userText) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;

  const history = conversationMemory.getMessages(userId);

  const contents = history.map(({ role, content }) => ({
    role: role === "assistant" ? "model" : "user",
    parts: [{ text: content }],
  }));

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
      systemInstruction: {
        parts: [
          {
            text: ghitIdentity,
          },
        ],
      },
      contents,
    }),
  });

  const data = await response.json();

  console.log("Gemini Response:", JSON.stringify(data, null, 2));

  if (!response.ok) {
    const error = new Error(JSON.stringify(data));
    error.status = response.status;
    throw error;
  }

  const reply =
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
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