const fetch = require("node-fetch");
const config = require("../../config");

console.log(">>> USING REST GEMINI SERVICE <<<");

async function getReply(userId, userText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: userText,
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[Gemini REST]", data);
    throw new Error(data.error?.message || "Gemini request failed");
  }

  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Sorry, I couldn't generate a response."
  );
}

module.exports = {
  getReply,
};
