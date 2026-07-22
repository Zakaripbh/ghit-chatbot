/**
 * Pluggable knowledge base retriever.
 *
 * Ships with a simple keyword-overlap matcher over a JSON array of
 * { id, question, answer, tags } entries — enough to run a working FAQ bot
 * with zero extra infrastructure.
 *
 * TO UPGRADE TO REAL RAG (vector search):
 *   Replace the body of `retrieve()` with a call to your vector DB
 *   (Pinecone / Weaviate / pgvector / Qdrant) that embeds `query` and
 *   returns the top-k nearest chunks. Keep the same return shape:
 *   [{ id, text, score }]
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'faq.json');

let cache = null;
function loadEntries() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (err) {
    console.error('[knowledgeBase] failed to load faq.json:', err.message);
    cache = [];
  }
  return cache;
}

function tokenize(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function score(queryTokens, entryTokens) {
  const set = new Set(entryTokens);
  let hits = 0;
  for (const t of queryTokens) if (set.has(t)) hits += 1;
  return hits / Math.max(queryTokens.length, 1);
}

/**
 * @param {string} query
 * @param {number} topK
 * @returns {Array<{id: string, text: string, score: number}>}
 */
function retrieve(query, topK = 3) {
  const entries = loadEntries();
  if (entries.length === 0) return [];

  const queryTokens = tokenize(query);
  const scored = entries.map((e) => ({
    id: e.id,
    text: `Q: ${e.question}\nA: ${e.answer}`,
    score: score(queryTokens, tokenize(`${e.question} ${e.tags?.join(' ') || ''}`)),
  }));

  return scored
    .filter((s) => s.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Builds the <context> block injected into the Claude call.
 * Returns '' when nothing relevant was found, so Claude falls back to
 * "I don't know" behavior defined in the system prompt.
 */
function buildContextBlock(query) {
  const hits = retrieve(query);
  if (hits.length === 0) return '';
  const joined = hits.map((h) => h.text).join('\n---\n');
  return `<context>\n${joined}\n</context>`;
}

module.exports = { retrieve, buildContextBlock };
