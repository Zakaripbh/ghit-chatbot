const config = require("../../config");
const claudeService = require("../claudeService");
const geminiService = require("./geminiService");

async function getReply(userId, userText) {
  switch (config.ai?.provider || "anthropic") {
    case "anthropic":
      return claudeService.getReply(userId, userText);

    case "gemini":
      return geminiService.getReply(userId, userText);

    default:
      throw new Error("Unsupported AI provider.");
  }
}

module.exports = { getReply };
