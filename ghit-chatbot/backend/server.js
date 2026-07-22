const express = require('express');
const cors = require('cors');
const config = require('./config');

const chatRoutes = require('./routes/chat');
const telegramRoutes = require('./routes/webhooks/telegram');
const whatsappRoutes = require('./routes/webhooks/whatsapp');
const messengerRoutes = require('./routes/webhooks/messenger');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: config.allowedOrigins.includes('*') ? true : config.allowedOrigins,
  }),
);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', chatRoutes);
app.use('/webhooks', telegramRoutes);
app.use('/webhooks', whatsappRoutes);
app.use('/webhooks', messengerRoutes);

// Central error handler — never leak internals to the client.
app.use((err, req, res, next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({
    error: "Something went wrong on our end. Please try again. / Akwai matsala — don Allah a sake gwadawa.",
  });
});

app.listen(config.port, () => {
  console.log(`GHIT chatbot backend listening on port ${config.port} (${config.nodeEnv})`);
});
