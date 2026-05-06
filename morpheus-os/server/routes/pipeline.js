'use strict';

const pipeline   = require('../pipeline/stageManager');
const pipelineLoop = require('../pipeline/pipelineLoop');
const { query }  = require('../services/db');

async function pipelineRoutes(fastify) {
  // Full pipeline overview
  fastify.get('/', async (req, reply) => {
    const { engine } = req.query;
    const counts = await pipeline.countByStage(engine || null);
    return reply.send({ counts, engine: engine || 'all' });
  });

  // Entries by stage
  fastify.get('/stage/:stage', async (req, reply) => {
    const { engine } = req.query;
    const entries = await pipeline.getByStage(req.params.stage, engine || null);
    return reply.send({ entries, count: entries.length });
  });

  // Create pipeline entry
  fastify.post('/', async (req, reply) => {
    const { leadId, engine, metadata } = req.body;
    if (!leadId || !engine) return reply.code(400).send({ error: 'leadId and engine required' });
    const entry = await pipeline.create({ leadId, engine, metadata });
    return reply.code(201).send({ entry });
  });

  // Advance stage manually (command centre use)
  fastify.patch('/:id/advance', async (req, reply) => {
    const { stage, ...extra } = req.body;
    if (!stage) return reply.code(400).send({ error: 'stage required' });
    const entry = await pipeline.advance(parseInt(req.params.id), stage, extra);
    if (!entry) return reply.code(404).send({ error: 'Pipeline entry not found' });
    return reply.send({ entry });
  });

  // Mark replied
  fastify.patch('/:id/replied', async (req, reply) => {
    await pipeline.markReplied(parseInt(req.params.id));
    return reply.send({ ok: true });
  });

  // Kill entry
  fastify.patch('/:id/kill', async (req, reply) => {
    await pipeline.kill(parseInt(req.params.id), req.body?.reason || '');
    return reply.send({ ok: true });
  });

  // Manually trigger pipeline loop for an engine
  fastify.post('/run/:engine', async (req, reply) => {
    const { engine } = req.params;
    const allowed = ['agency', 'property', 'academy', 'grant'];
    if (!allowed.includes(engine)) return reply.code(400).send({ error: 'Invalid engine' });

    // Fire and forget
    setImmediate(() => pipelineLoop.run(engine, req.body || {}).catch(console.error));
    return reply.code(202).send({ ok: true, engine, status: 'loop_started' });
  });

  // Stale leads
  fastify.get('/stale', async (req, reply) => {
    const { engine, hours = 48 } = req.query;
    const stale = await pipeline.getStale({ engine, maxHours: parseInt(hours) });
    return reply.send({ stale, count: stale.length });
  });

  // Outreach event log
  fastify.get('/:id/outreach', async (req, reply) => {
    const result = await query(
      `SELECT * FROM outreach_events WHERE pipeline_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    return reply.send({ events: result.rows });
  });
}

module.exports = pipelineRoutes;
