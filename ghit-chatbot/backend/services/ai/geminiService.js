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
  console.log("Gemini Response:", JSON.stringify(data, null, 2));

  if (!response.ok) {
  throw new Error(JSON.stringify(data));
}

  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Sorry, I couldn't generate a response."
  );
}

module.exports = {
  getReply,
};
