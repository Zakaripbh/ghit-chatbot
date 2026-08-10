const config = require("../../config");

async function getReply(userId, userText) {
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
        messages: [
          {
            role: "system",
            content:
              "You are GHIT Health Assistant, a bilingual health assistant supporting English and Hausa. Provide clear, safe, evidence-based health information. Do not claim to replace a healthcare professional. For emergencies, advise the user to seek urgent medical care.",
          },
          {
            role: "user",
            content: userText,
          },
        ],
      }),
    }
  );

  const data = await response.json();

  console.log("Groq Response:", JSON.stringify(data, null, 2));

  if (!response.ok) {
    const error = new Error(
      data?.error?.message || `Groq request failed: ${response.status}`
    );

    error.status = response.status;
    throw error;
  }

  return (
    data?.choices?.[0]?.message?.content ||
    "Sorry, I couldn't generate a response."
  );
}

module.exports = {
  getReply,
};