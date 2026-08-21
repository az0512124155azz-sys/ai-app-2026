// backend/utils/sseRegistry.js
// Simple SSE registry to push status updates per session
const clients = new Map(); // sessionId -> { req, res }

function register(req, res, sessionId) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders && res.flushHeaders();
  const client = { req, res };
  clients.set(sessionId, client);
  console.log(`[SSE] Registered client for session ${sessionId}`);

  req.on('close', () => {
    clients.delete(sessionId);
    console.log(`[SSE] Connection closed for session ${sessionId}`);
  });
}

function push(sessionId, event, data) {
  const client = clients.get(sessionId);
  if (!client) return;
  try {
    client.res.write(`event: ${event}\n`);
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (e) {
    console.error('[SSE PUSH ERROR]', e);
  }
}

module.exports = { register, push, sseRegistry: { register, push } };
