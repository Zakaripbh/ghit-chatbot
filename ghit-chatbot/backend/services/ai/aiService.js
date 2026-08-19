const config = require("../../config");
const geminiService = require("./geminiService");
const groqService = require("./groqService");
const openrouterService = require("./openrouterService");

function isRetryableError(err) {
  const status = Number(err?.status || err?.statusCode || 0);
  const message = String(err?.message || "").toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    status === 408 ||
    status === 429 ||
    status >= 500 ||
    message.includes("401") ||
    message.includes("403") ||
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("resource_exhausted") ||
    message.includes("rate limit") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("temporarily unavailable") ||
    message.includes("overloaded")
  );
}

function isValidReply(reply) {
  return (
    typeof reply === "string" &&
    reply.trim().length > 0 &&
    !reply.toLowerCase().includes("undefined") &&
    !reply.toLowerCase().includes("[object object]")
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

      const reply = await provider.service.getReply(
        userId,
        userText
      );

      // Do not accept an empty or malformed provider response
      // as a successful response.
      if (!isValidReply(reply)) {
        const error = new Error(
          `${provider.name} returned an empty or invalid response`
        );

        error.status = 502;
        throw error;
      }

      console.log(`[AI] ${provider.name} succeeded`);

      return reply;
    } catch (err) {
      lastError = err;

      // Kept for logging only now — it no longer gates whether we
      // move on. Every failure falls through to the next provider,
      // so one provider's outage or an unrecognized error can never
      // kill the whole chain early.
      const retryable = isRetryableError(err);

      console.error(
        `[AI] ${provider.name} failed (${retryable ? "retryable" : "unrecognized"}):`,
        err?.message || err
      );

      console.warn(
        `[AI] Trying next provider.`
      );
    }
  }

  throw (
    lastError ||
    new Error("All AI providers failed.")
  );
}

module.exports = {
  getReply,
};
