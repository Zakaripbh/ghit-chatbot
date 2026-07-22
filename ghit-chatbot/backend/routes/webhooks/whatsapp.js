const express = require('express');
const fetch = require('node-fetch');
const config = require('../../config');
const claudeService = require('../../services/claudeService');

const router = express.Router();
const GRAPH_URL = `https://graph.facebook.com/v20.0/${config.whatsapp.phoneNumberId}/messages`;

// Meta verification handshake (GET)
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

async function sendMessage(to, body) {
  await fetch(GRAPH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.whatsapp.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      text: { body },
    }),
  });
}

router.post('/whatsapp', async (req, res) => {
  res.sendStatus(200); // ack immediately

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (!message || message.type !== 'text') return;

    const from = message.from; // sender's WhatsApp number
    const text = message.text.body;

    const reply = await claudeService.getReply(`whatsapp:${from}`, text);
    await sendMessage(from, reply);
  } catch (err) {
    console.error('[whatsapp webhook] error:', err.message);
  }
});

module.exports = router;
