// backend/server.js
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const chatRoute = require('./routes/chat');
const downloadRoute = require('./routes/download');
const { sseRegistry } = require('./utils/sseRegistry');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Simple health
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: Date.now() }));

// SSE endpoint per session to stream live status
app.get('/api/events/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  sseRegistry.register(req, res, sessionId);
});

// Routes
app.use('/api/chat', chatRoute);
app.use('/api/download', downloadRoute);

// global error catcher (fallback)
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message || String(err) });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
