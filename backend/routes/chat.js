// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const { search } = require('../duckduckgo');
const { chooseModel, getApiKeyFor } = require('../modelRouter');
const { invokeModel } = require('../nimClient');
const logger = require('../utils/logger');
const systemPrompt = require('../systemPrompt');
const { push } = require('../utils/sseRegistry');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt();

// POST /api/chat
// body: { sessionId, mode, userMessage, messages: [{role,content}], options }
router.post('/', async (req, res) => {
  const startTs = Date.now();
  const { sessionId = `s-${Date.now()}`, mode = 'research', userMessage, messages = [], options = {} } = req.body;
  logger.info('Chat request', { sessionId, mode, userMessage });
  // push initial status
  push(sessionId, 'status', { status: 'received', message: 'Request received by server' });

  // Step 1: Search web (best-effort) if mode indicates web or research
  let sources = [];
  try {
    push(sessionId, 'status', { status: 'searching', message: 'Searching the web...' });
    if (mode === 'web' || mode === 'research' || options.forceWeb) {
      sources = await search(userMessage);
    } else {
      // optionally still do a short search for citations
      sources = await search(userMessage).catch(e => []);
    }
    push(sessionId, 'status', { status: 'search_done', message: `Found ${sources.length} sources` });
  } catch (err) {
    // search() is resilient but include catch for safety
    logger.error('Search stage error', err);
    push(sessionId, 'status', { status: 'search_error', message: 'Search failed, continuing with internal knowledge' });
    sources = [];
  }

  // Step 2: Build prompt for model
  push(sessionId, 'status', { status: 'building_prompt', message: 'Building system prompt and conversation context' });
  const modelRoute = chooseModel(mode);
  const apiKey = getApiKeyFor(modelRoute);

  if (!apiKey) {
    logger.error('Missing API key for chosen model:', modelRoute);
    return res.status(500).json({
      error: 'Missing API key',
      message: `No API key found for model ${modelRoute.model}. Please set env var ${modelRoute.env}`,
      code: 'MISSING_API_KEY'
    });
  }

  // Compose sources block for the model (structured)
  const sourcesText = sources.map((s, i) => `[${i+1}] ${s.title} — ${s.url}`).join('\n') || 'No search results (DuckDuckGo failed or returned no items).';

  const conversationText = [
    { role: 'system', content: systemPrompt },
    ...messages,
    { role: 'user', content: userMessage },
    { role: 'assistant', content: `Use the following web sources when relevant:\n${sourcesText}\n\nCite sources inline as [1],[2] etc.` }
  ];

  // Minimal payload for NIM; adjust to NIM API contract if needed.
  const payload = {
    input: {
      // concatenated prompt - can be refined to use structured messages if NIM supports it
      prompt: conversationText.map(m => `${m.role.toUpperCase()}:\n${m.content}`).join('\n\n'),
      max_tokens: options.max_tokens || 1024,
      temperature: options.temperature || 0.2
    },
    // metadata for diagnostics
    meta: { sessionId, mode, timestamp: Date.now() }
  };

  push(sessionId, 'status', { status: 'invoking_model', message: `Invoking model ${modelRoute.model}` });

  try {
    logger.info('Invoking model', modelRoute.model);
    const nimResponse = await invokeModel(modelRoute.model, apiKey, payload);
    logger.info('Model returned result');

    // Example parsing: assume nimResponse.output or nimResponse.text
    const rawText = nimResponse?.output?.text || nimResponse?.text || JSON.stringify(nimResponse);

    // Enforce that model includes citations — but if not, we add Sources block ourselves
    let answerMarkdown = String(rawText);
    if (!answerMarkdown.includes('[1]') && sources.length) {
      // Append sources block
      const sourcesMd = '\n\n---\n\nSources:\n' + sources.map((s, i) => `${i+1}. [${s.title}](${s.url})`).join('\n');
      answerMarkdown += sourcesMd;
    } else if (!sources.length) {
      answerMarkdown = 'Note: Web search returned no sources. Answering from model knowledge.\n\n' + answerMarkdown;
    }

    push(sessionId, 'status', { status: 'completed', message: 'Model finished generating response' });

    const html = md.render(answerMarkdown);

    const responsePayload = {
      sessionId,
      mode,
      answer_markdown: answerMarkdown,
      answer_html: html,
      sources,
      meta: { model: modelRoute.model, duration_ms: Date.now() - startTs }
    };

    logger.info('Responding to client', { sessionId, model: modelRoute.model });
    return res.json(responsePayload);
  } catch (err) {
    logger.error('Model invocation error', err);
    push(sessionId, 'status', { status: 'model_error', message: 'Model call failed' });
    return res.status(500).json({
      error: 'Model invocation failed',
      detail: err.message || String(err),
      meta: { model: modelRoute.model }
    });
  }
});

module.exports = router;
