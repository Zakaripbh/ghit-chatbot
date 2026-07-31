const express = require('express');
const rateLimit = require('express-rate-limit');
const aiService = require('../services/ai/aiService');
const {
  EMPTY_INPUT_MESSAGES,
  detectLanguage,
} = require('../services/languageDetect');

const router = express.Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many messages — please slow down. / Don Allah a rage sauri.',
  },
});

router.post('/chat', limiter, async (req, res) => {
  try {
    const { userId, message } = req.body || {};

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      const lang = detectLanguage(message || '');
      return res.status(200).json({
        reply: EMPTY_INPUT_MESSAGES[lang] || EMPTY_INPUT_MESSAGES.en,
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        error: 'Message too long (max 4000 characters).',
      });
    }

    const reply = await aiService.getReply(
      `web:${userId}`,
      message.trim()
    );

    return res.json({ reply });

  } catch (err) {
    console.error("[CHAT ERROR]", err);
    return res.status(500).json({
      error: err.message || "Internal server error",
    });
  }
});

module.exports = router;
