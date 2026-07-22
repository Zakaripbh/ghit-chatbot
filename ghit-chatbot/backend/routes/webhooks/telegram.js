const express = require('express');
const fetch = require('node-fetch');
const config = require('../../config');
const claudeService = require('../../services/claudeService');

const router = express.Router();
const TELEGRAM_API = `https://api.telegram.org/bot${config.telegram.botToken}`;

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

router.post('/telegram', async (req, res) => {
  // Always 200 quickly so Telegram doesn't retry-storm on slow LLM calls.
  res.sendStatus(200);

  try {
    const message = req.body?.message;
    const chatId = message?.chat?.id;
    const text = message?.text;
    if (!chatId || !text) return;

    const reply = await claudeService.getReply(`telegram:${chatId}`, text);
    await sendMessage(chatId, reply);
  } catch (err) {
    console.error('[telegram webhook] error:', err.message);
  }
});

module.exports = router;
