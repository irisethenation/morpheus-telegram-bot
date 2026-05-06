'use strict';

const app       = require('./app');
const env       = require('./config/env');
const db        = require('./services/db');
const bus       = require('./services/eventBus');
const sock      = require('./services/socketServer');
const scheduler = require('./services/scheduler');
const { init: initAgents } = require('./agents/morpheus');

// Engine daily runners
const agencyEngine   = require('./engines/agencyEngine');
const propertyEngine = require('./engines/propertyEngine');
const grantEngine    = require('./engines/grantEngine');
const academyEngine  = require('./engines/academyEngine');

async function start() {
  try {
    // Connect data layer
    await db.connect();
    await bus.connect();

    // Boot agents
    initAgents();

    // Register daily engine schedules (06:00 UTC daily)
    scheduler.register('agency-engine-daily',   '0 6 * * *', () => agencyEngine.run());
    scheduler.register('property-engine-daily',  '0 6 * * *', () => propertyEngine.run());
    scheduler.register('grant-engine-daily',     '0 6 * * *', () => grantEngine.run());
    scheduler.register('academy-engine-daily',   '0 6 * * *', () => academyEngine.run());

    // KPI review every 4 hours
    scheduler.register('morpheus-kpi-review', '0 */4 * * *', async () => {
      const { dispatch } = require('./agents/orchestrator');
      const { v4: uuidv4 } = require('uuid');
      await dispatch({ task_uuid: uuidv4(), agent: 'morpheus', task_type: 'kpi_review', dispatched_by: 'scheduler', user_id: 0, user_name: 'Scheduler', chat_id: 0, data: {} });
    });

    // Learning loop — once daily at 23:00 UTC
    scheduler.register('morpheus-learn', '0 23 * * *', async () => {
      const { dispatch } = require('./agents/orchestrator');
      const { v4: uuidv4 } = require('uuid');
      await dispatch({ task_uuid: uuidv4(), agent: 'morpheus', task_type: 'learn_and_suggest', dispatched_by: 'scheduler', user_id: 0, user_name: 'Scheduler', chat_id: 0, data: {} });
    });

    scheduler.startAll();

    // Start Fastify
    await app.listen({ port: env.server.port, host: env.server.host });

    // Attach Socket.IO command centre
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
