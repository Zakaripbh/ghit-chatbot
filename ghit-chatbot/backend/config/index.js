require('dotenv').config();

module.exports = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // CORS
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '*').split(','),

  // AI Provider Selection
  ai: {
    provider: process.env.AI_PROVIDER || 'gemini',
  },

  // Anthropic (Claude)
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
    maxTokens: 1024,
  },

  // Google Gemini
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  },

  // Groq
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  },

  // OpenRouter
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || 'openrouter/free',
  },

  // Redis
  redisUrl: process.env.REDIS_URL || null,

  // Telegram
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },

  // WhatsApp
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  },

  // Facebook Messenger
  messenger: {
    pageToken: process.env.MESSENGER_PAGE_TOKEN,
    verifyToken: process.env.MESSENGER_VERIFY_TOKEN,
  },

  // Conversation Memory
  memory: {
    maxTurns: 12,
    ttlSeconds: 60 * 60 * 24,
    summaryTtlSeconds: 60 * 60 * 24 * 30,
  },
};