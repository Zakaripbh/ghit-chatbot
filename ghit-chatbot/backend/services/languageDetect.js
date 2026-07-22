/**
 * Lightweight heuristic language detector for English vs Hausa.
 * This is a fast pre-filter only — the real, authoritative language decision
 * is left to Claude (which reads the actual message and replies in kind).
 * This helper is useful for logging/analytics and for picking fallback
 * error strings when Claude itself is unreachable.
 */

const HAUSA_MARKERS = [
  'da', 'na', 'ta', 'ba', 'ne', 'ce', 'sannu', 'yaya', 'lafiya', 'ina',
  'me', 'don', 'allah', 'yau', 'gobe', 'jiya', 'kudi', 'aiki', 'gida',
  'zafi', 'sanyi', 'nawa', 'akwai', 'zan', 'zamu', 'kana', 'kina',
];

function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';
  const words = text
    .toLowerCase()
    .replace(/[^a-zA-ZàâçéèêëîïôûùüÿñæœÀÂÇÉÈÊËÎÏÔÛÙÜŸÑÆŒ\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'en';

  const hausaHits = words.filter((w) => HAUSA_MARKERS.includes(w)).length;
  const ratio = hausaHits / words.length;

  return ratio >= 0.15 ? 'ha' : 'en';
}

const FALLBACK_MESSAGES = {
  en: "Sorry, I'm having trouble responding right now — please try again in a moment.",
  ha: 'Yi haƙuri, akwai matsala a yanzu — don Allah a sake gwadawa bayan ɗan lokaci.',
};

const EMPTY_INPUT_MESSAGES = {
  en: 'Could you tell me a bit more about what you need help with?',
  ha: 'Za ka iya faɗa mini ƙarin bayani game da abin da kake bukatar taimako a kai?',
};

module.exports = { detectLanguage, FALLBACK_MESSAGES, EMPTY_INPUT_MESSAGES };
