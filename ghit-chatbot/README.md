# GHIT — Bilingual (English/Hausa) AI Support Chatbot

Production-ready chatbot built on the Claude API, with a Node.js/Express backend,
a lightweight web widget frontend, and webhook adapters for Telegram, WhatsApp,
and Facebook Messenger.

---

## 1. Architecture

```
                         ┌─────────────────────┐
                         │   Clients            │
                         │  Website widget       │
                         │  Telegram             │
                         │  WhatsApp Cloud API   │
                         │  Messenger            │
                         └──────────┬───────────┘
                                    │ HTTPS
                         ┌──────────▼───────────┐
                         │   Express API Layer   │
                         │  /api/chat            │
                         │  /webhooks/telegram    │
                         │  /webhooks/whatsapp    │
                         │  /webhooks/messenger   │
                         └──────────┬───────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
    ┌────────▼───────┐   ┌──────────▼─────────┐  ┌─────────▼────────┐
    │ Memory Store    │   │ Knowledge Base      │  │ Claude Service    │
    │ (session +      │   │ (retrieval /        │  │ (Anthropic API    │
    │  short/long term)│   │  FAQ / docs search)  │  │  wrapper + guard) │
    └────────┬───────┘   └──────────┬─────────┘  └─────────┬────────┘
             │                      │                      │
             └──────────────────────┴──────────────────────┘
                                    │
                         ┌──────────▼───────────┐
                         │   Anthropic Claude    │
                         │   API (claude-sonnet-5)│
                         └───────────────────────┘
```

**Layers:**
- **API layer** — one shared `/api/chat` handler; each channel adapter (Telegram,
  WhatsApp, Messenger) normalizes its inbound payload into `{ userId, text }` and
  calls the same handler, then formats the reply back into that channel's format.
- **Memory store** — per-user conversation history (Redis in production, in-memory
  Map for local dev).
- **Knowledge base** — pluggable retriever; ships with a simple keyword/FAQ matcher,
  designed to be swapped for a vector DB (Pinecone/Weaviate/pgvector) without
  touching the rest of the app.
- **Claude service** — the only place that talks to the Anthropic API. Owns the
  system prompt, language handling, retries, and content-safety fallback.

---

## 2. Features

- Natural-language understanding via Claude, with automatic English/Hausa detection.
- Context-aware multi-turn conversation (per-user history, trimmed to a token budget).
- Retrieval-augmented answers from a knowledge base, with an honest "I don't know /
  ban san amsa ba" fallback when nothing relevant is found.
- Clarifying questions on ambiguous input.
- Structured output (numbered steps, bullet lists) enforced via system prompt.
- Rate limiting and input validation.
- Centralized error handling with user-safe messages.
- Channel adapters: Website, Telegram, WhatsApp Business Cloud API, Messenger.
- Dockerized for one-command deployment.

---

## 3. Memory Handling Strategy

| Layer | What it stores | Where | TTL |
|---|---|---|---|
| **Turn buffer** | Last N (default 12) messages per user, sent verbatim to Claude | Redis key `chat:{userId}` | 24h rolling |
| **Summary memory** | When history exceeds the token budget, older turns are summarized by Claude into a compact "facts so far" block and prepended to future calls | Redis key `summary:{userId}` | 30 days |
| **Knowledge base** | Static/organizational knowledge, not user-specific | Vector store / JSON | Permanent |

Rules:
1. Always send: `[summary block] + [last N raw turns] + [new user message]`.
2. Once raw turns exceed ~3,000 tokens, summarize the oldest half and fold it into
   the summary block, then drop those raw turns.
3. Never store secrets (passwords, card numbers) even if the user pastes them —
   the memory store scrubs obvious patterns (see `services/memoryStore.js`).

---

## 4. Conversation Flow

1. Inbound message arrives at `/api/chat` (or a webhook adapter).
2. Input validated (non-empty, length capped, rate-limit check).
3. Memory store fetches this user's history + summary.
4. Knowledge base is queried for relevant context; top matches attached as `<context>`.
5. Claude service builds the message list: `system prompt + summary + history + context + new message`.
6. Claude API call (with automatic retry on transient failure).
7. Response validated (non-empty, not an error stub) and safety-checked.
8. Memory store appends the new turn; triggers summarization if needed.
9. Reply formatted per channel and sent back.
10. If any step fails, a friendly bilingual fallback message is returned (see Error Handling).

---

## 5. Error Handling

| Failure | Behavior |
|---|---|
| Claude API timeout/5xx | Retry twice with backoff; on final failure, return: "Sorry, I'm having trouble responding right now — please try again in a moment. / Yi haƙuri, akwai matsala a yanzu — don Allah a sake gwadawa." |
| Invalid/empty input | Ask the user to rephrase, don't call the API. |
| Rate limit exceeded | Return 429 with a polite "please slow down" message. |
| Knowledge base unreachable | Log the error, proceed without context (Claude still answers from general knowledge and says if it's unsure). |
| Unknown webhook payload shape | Log and return 200 (so the platform doesn't retry-storm you), no reply sent. |
| Uncaught exception | Global Express error middleware catches it, logs stack trace server-side, returns generic safe message to user — never leaks stack traces to the client. |

---

## 6. Safety Rules

Enforced both in the system prompt and, redundantly, in code:
- Reject empty/oversized payloads (`routes/chat.js`).
- Basic PII scrub before persisting memory (`services/memoryStore.js`).
- Never log full API keys; `.env` is git-ignored.
- Claude's own refusal behavior (harmful/illegal content) is the primary safety
  layer — this is a model-level guarantee, not something the app re-implements.
- Optional: add a moderation pre-filter (e.g., a keyword/regex blocklist) in
  `routes/chat.js` for domain-specific banned topics before the request ever
  reaches Claude.

---

## 7. Knowledge Base Integration

`backend/services/knowledgeBase.js` ships with a simple JSON/keyword matcher so
you can run this out of the box with zero extra infrastructure. To upgrade to
real RAG:

1. Chunk your documents (500–1000 tokens each).
2. Embed each chunk with any embedding model (OpenAI `text-embedding-3-small`,
   Cohere, Voyage, etc. — Anthropic does not currently offer an embeddings endpoint).
3. Store vectors in Pinecone/Weaviate/pgvector/Qdrant.
4. Replace `knowledgeBase.retrieve(query)` with a vector similarity search that
   returns the top 3–5 chunks.
5. Everything downstream (claudeService, memory, routes) stays unchanged —
   that's the point of the pluggable interface.

---

## 8. API Integration Example (raw Anthropic call)

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-5",
    "max_tokens": 1024,
    "system": "<the system prompt from SYSTEM_PROMPT.md>",
    "messages": [
      {"role": "user", "content": "Ina zafin jiki na yau a Kano?"}
    ]
  }'
```

See `backend/services/claudeService.js` for the wrapped, production version
(retries, memory, knowledge base injection).

---

## 9. Deployment Guide

### Local
```bash
cd backend
cp .env.example .env      # fill in ANTHROPIC_API_KEY, REDIS_URL, tokens
npm install
npm run dev                # http://localhost:3000
```
Open `frontend/index.html` in a browser (or serve it statically) — it points at
`http://localhost:3000/api/chat`.

### Docker
```bash
docker compose up --build
```
This starts the API (port 3000) and a Redis instance.

### Production (any VPS / Render / Railway / Fly.io)
1. Set environment variables from `.env.example` in your host's dashboard.
2. Point a managed Redis instance at `REDIS_URL` (Upstash/Redis Cloud both have
   free tiers).
3. Deploy `backend/` as the service; expose port 3000 behind HTTPS (the host's
   load balancer or a Caddy/Nginx reverse proxy with Let's Encrypt).
4. Serve `frontend/` from any static host (Netlify, Vercel, S3+CloudFront, or
   the same Express app via `express.static`).
5. Point each channel's webhook URL at `https://yourdomain.com/webhooks/<channel>`.

---

## 10. Connecting Channels

### Telegram
1. Message `@BotFather` → `/newbot` → get your bot token.
2. Set `TELEGRAM_BOT_TOKEN` in `.env`.
3. Register the webhook once:
   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=https://yourdomain.com/webhooks/telegram"
   ```
4. Done — Telegram will POST updates to `routes/webhooks/telegram.js`.

### WhatsApp (Meta Cloud API)
1. Create a Meta App → add the "WhatsApp" product → get a temporary/permanent
   access token and a phone number ID.
2. Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` in `.env`.
3. In the Meta App dashboard, set the webhook callback URL to
   `https://yourdomain.com/webhooks/whatsapp` and the verify token to match
   `WHATSAPP_VERIFY_TOKEN`.
4. Subscribe to the `messages` field.

### Facebook Messenger
1. Create a Meta App → add the "Messenger" product → link a Facebook Page →
   get a Page Access Token.
2. Set `MESSENGER_PAGE_TOKEN`, `MESSENGER_VERIFY_TOKEN` in `.env`.
3. Set the webhook callback URL to `https://yourdomain.com/webhooks/messenger`,
   verify token matching `MESSENGER_VERIFY_TOKEN`, subscribe to `messages`.

### Website
Embed the widget:
```html
<script src="https://yourdomain.com/widget/chat.js" defer></script>
```
or embed `frontend/index.html` directly in an iframe.

---

## 11. Project Structure

```
ghit-chatbot/
├── SYSTEM_PROMPT.md
├── README.md
├── docker-compose.yml
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   ├── config/index.js
│   ├── services/
│   │   ├── claudeService.js
│   │   ├── knowledgeBase.js
│   │   ├── languageDetect.js
│   │   └── memoryStore.js
│   └── routes/
│       ├── chat.js
│       └── webhooks/
│           ├── telegram.js
│           ├── whatsapp.js
│           └── messenger.js
└── frontend/
    ├── index.html
    ├── style.css
    └── chat.js
```
