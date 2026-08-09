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

function getErrorStatus(err) {
  const message = String(err?.message || '').toLowerCase();

  if (
    err?.status === 429 ||
    err?.statusCode === 429 ||
    message.includes('429') ||
    message.includes('quota') ||
    message.includes('resource_exhausted') ||
    message.includes('rate limit')
  ) {
    return 'quota';
  }

  if (
    err?.status === 401 ||
    err?.statusCode === 401 ||
    message.includes('401') ||
    message.includes('unauthorized') ||
    message.includes('api key')
  ) {
    return 'auth';
  }

  if (
    err?.status >= 500 ||
    err?.statusCode >= 500 ||
    message.includes('500') ||
    message.includes('internal server')
  ) {
    return 'service';
  }

  return 'unknown';
}

function getFriendlyError(lang, type) {
  const messages = {
    en: {
      quota:
        'GHIT is temporarily unavailable because the AI service has reached its usage limit. Please try again later.',
      auth:
        'GHIT is temporarily unavailable due to an AI service configuration problem. Please try again later.',
      service:
        'GHIT is temporarily unavailable. Please try again later.',
      unknown:
        'Sorry, something went wrong. Please try again later.',
    },

    ha: {
      quota:
        'GHIT ba ya samuwa na dan lokaci saboda an kai iyakar amfani da sabis din AI. Da fatan za a sake gwadawa daga baya.',
      auth:
        'GHIT ba ya samuwa na dan lokaci saboda matsalar saitin sabis din AI. Da fatan za a sake gwadawa daga baya.',
      service:
        'GHIT ba ya samuwa na dan lokaci. Da fatan za a sake gwadawa daga baya.',
      unknown:
        'Yi hakuri, wani abu ya samu matsala. Da fatan za a sake gwadawa daga baya.',
    },
  };

  return messages[lang]?.[type] || messages.en[type];
}

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
    console.error('[CHAT ERROR]', err);

    const lang = detectLanguage(req.body?.message || '');
    const errorType = getErrorStatus(err);

    return res.status(503).json({
      error: getFriendlyError(lang, errorType),
    });
  }
});

module.exports = router;