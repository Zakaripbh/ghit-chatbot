const config = require("../../config");
const geminiService = require("./geminiService");
const groqService = require("./groqService");
const openrouterService = require("./openrouterService");

function isRetryableError(err) {
  const status = Number(err?.status || err?.statusCode || 0);
  const message = String(err?.message || "").toLowerCase();

  return (
    status === 408 ||
    status === 429 ||
    status >= 500 ||
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("resource_exhausted") ||
    message.includes("rate limit") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("fetch failed") ||
    message.includes("network")
  );
}

async function getReply(userId, userText) {
  const providers = [];

  if (config.gemini?.apiKey) {
    providers.push({
      name: "Gemini",
      service: geminiService,
    });
  }

  if (config.groq?.apiKey) {
    providers.push({
      name: "Groq",
      service: groqService,
    });
  }

  if (config.openrouter?.apiKey) {
    providers.push({
      name: "OpenRouter",
      service: openrouterService,
    });
  }

  if (!providers.length) {
    throw new Error("No AI providers are configured.");
  }

  let lastError;

  for (const provider of providers) {
    try {
      console.log(`[AI] Trying ${provider.name}`);

      const reply = await provider.service.getReply(userId, userText);

      console.log(`[AI] ${provider.name} succeeded`);

      return reply;
    } catch (err) {
      lastError = err;

      console.error(
        `[AI] ${provider.name} failed:`,
        err?.message || err
      );

      if (!isRetryableError(err)) {
        throw err;
      }

      console.warn(
        `[AI] ${provider.name} failed with retryable error. Trying next provider.`
      );
    }
  }

  throw lastError || new Error("All AI providers failed.");
}

module.exports = {
  getReply,
};