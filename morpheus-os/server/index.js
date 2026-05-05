'use strict';

const app  = require('./app');
const env  = require('./config/env');
const db   = require('./services/db');
const bus  = require('./services/eventBus');
const sock = require('./services/socketServer');
const { init: initAgents } = require('./agents/morpheus');

async function start() {
  try {
    // Connect data layer
    await db.connect();
    await bus.connect();

    // Boot agents
    initAgents();

    // Start Fastify (builds underlying http.Server)
    await app.listen({ port: env.server.port, host: env.server.host });

    // Attach Socket.IO to the same HTTP server
    sock.init(app.server);

    console.log(`[MORPHEUS] Sovereign stack online — port ${env.server.port}`);

  } catch (err) {
    console.error('[MORPHEUS] Boot failure:', err.message);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('[MORPHEUS] SIGTERM received — graceful shutdown');
  await app.close();
  process.exit(0);
});

start();
