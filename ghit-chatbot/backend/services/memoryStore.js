/**
 * Conversation memory store.
 * Uses Redis when REDIS_URL is set; falls back to an in-memory Map for local dev
 * (memory is lost on restart in that mode — fine for development only).
 */

const config = require('../config');

let redisClient = null;
if (config.redisUrl) {
  const Redis = require('ioredis');
  redisClient = new Redis(config.redisUrl);
  redisClient.on('error', (err) => console.error('[memoryStore] Redis error:', err.message));
}

const memMap = new Map(); // fallback store: userId -> { turns: [], summary: '' }

// Very basic PII scrub before persisting — never store obvious card numbers,
// or long digit sequences that look like phone/ID numbers embedded in free text.
function scrub(text) {
  return text
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[redacted-number]')
    .replace(/\b\d{9,}\b/g, '[redacted-number]');
}

async function getState(userId) {
  if (redisClient) {
    const raw = await redisClient.get(`chat:${userId}`);
    const summary = await redisClient.get(`summary:${userId}`);
    return {
      turns: raw ? JSON.parse(raw) : [],
      summary: summary || '',
    };
  }
  const entry = memMap.get(userId) || { turns: [], summary: '' };
  return entry;
}

async function saveState(userId, { turns, summary }) {
  if (redisClient) {
    await redisClient.set(`chat:${userId}`, JSON.stringify(turns), 'EX', config.memory.ttlSeconds);
    if (summary) {
      await redisClient.set(`summary:${userId}`, summary, 'EX', config.memory.summaryTtlSeconds);
    }
    return;
  }
  memMap.set(userId, { turns, summary });
}

/**
 * Appends a user/assistant turn pair and trims history, producing a
 * `needsSummarization` flag when the caller should fold old turns into
 * the summary (done in claudeService using Claude itself).
 */
async function appendTurn(userId, userText, assistantText) {
  const state = await getState(userId);
  const turns = [
    ...state.turns,
    { role: 'user', content: scrub(userText) },
    { role: 'assistant', content: assistantText },
  ];

  const needsSummarization = turns.length > config.memory.maxTurns * 2;
  await saveState(userId, { turns, summary: state.summary });

  return { turns, summary: state.summary, needsSummarization };
}

async function applySummary(userId, newSummary, keptTurns) {
  await saveState(userId, { turns: keptTurns, summary: newSummary });
}

module.exports = { getState, saveState, appendTurn, applySummary };
