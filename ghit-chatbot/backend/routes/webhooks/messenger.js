const express = require('express');
const fetch = require('node-fetch');
const config = require('../../config');
const claudeService = require('../../services/claudeService');

const router = express.Router();
const GRAPH_URL = `https://graph.facebook.com/v20.0/me/messages?access_token=${config.messenger.pageToken}`;

// Meta verification handshake (GET)
router.get('/messenger', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.messenger.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

async function sendMessage(psid, text) {
  await fetch(GRAPH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text },
    }),
  });
}

router.post('/messenger', async (req, res) => {
  res.sendStatus(200); // ack immediately

  try {
    const entry = req.body?.entry?.[0];
    const messaging = entry?.messaging?.[0];
    const psid = messaging?.sender?.id;
    const text = messaging?.message?.text;
    if (!psid || !text) return;

    const reply = await claudeService.getReply(`messenger:${psid}`, text);
    await sendMessage(psid, reply);
  } catch (err) {
    console.error('[messenger webhook] error:', err.message);
  }
});

module.exports = router;
