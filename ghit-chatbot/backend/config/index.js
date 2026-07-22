require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '*').split(','),

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
    maxTokens: 1024,
  },

  redisUrl: process.env.REDIS_URL || null,

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },

  whatsapp: {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  },

  messenger: {
    pageToken: process.env.MESSENGER_PAGE_TOKEN,
    verifyToken: process.env.MESSENGER_VERIFY_TOKEN,
  },

  memory: {
    maxTurns: 12,          // raw turns kept before summarizing
    ttlSeconds: 60 * 60 * 24,      // 24h for raw turns
    summaryTtlSeconds: 60 * 60 * 24 * 30, // 30 days for summary
  },
};
