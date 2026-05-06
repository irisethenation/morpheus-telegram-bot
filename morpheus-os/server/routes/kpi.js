'use strict';

const kpiStore   = require('../memory/kpiStore');
const assets     = require('../memory/winningAssets');
const sopLib     = require('../memory/sopLibrary');
const orchestrator = require('../agents/orchestrator');
const { query }  = require('../services/db');
const { v4: uuidv4 } = require('uuid');

async function kpiRoutes(fastify) {
  // ── KPI Snapshots ─────────────────────────────
  fastify.get('/snapshots', async (req, reply) => {
    const { engine, days = 7 } = req.query;
    const history = engine
      ? await kpiStore.getHistory(engine, parseInt(days))
      : await kpiStore.getAllHistory(parseInt(days));
    return reply.send({ snapshots: history });
  });

  fastify.get('/snapshots/:engine/today', async (req, reply) => {
    const snap = await kpiStore.getToday(req.params.engine);
    if (!snap) return reply.code(404).send({ error: 'No snapshot for today yet' });
    return reply.send({ snapshot: snap });
  });

  // ── Targets ───────────────────────────────────
  fastify.get('/targets/:engine', async (req, reply) => {
    const targets = await kpiStore.getTargets(req.params.engine);
    return reply.send({ engine: req.params.engine, targets });
  });

  // ── Morpheus KPI Review (triggers auto-correct) ─
  fastify.post('/review', async (req, reply) => {
    const { engine } = req.body || {};
    const result = await orchestrator.dispatch({
      task_uuid:     uuidv4(),
      agent:         'morpheus',
      task_type:     'kpi_review',
      dispatched_by: 'command-centre',
      user_id:       0,
      user_name:     'Operator',
      chat_id:       0,
      data:          { engine }
    });
    return reply.code(202).send({ ok: true, ...result });
  });

  // ── Learning Loop ─────────────────────────────
  fastify.post('/learn', async (req, reply) => {
    const result = await orchestrator.dispatch({
      task_uuid:     uuidv4(),
      agent:         'morpheus',
      task_type:     'learn_and_suggest',
      dispatched_by: 'command-centre',
      user_id:       0,
      user_name:     'Operator',
      chat_id:       0,
      data:          {}
    });
    return reply.code(202).send({ ok: true, ...result });
  });

  // ── Suggestions ───────────────────────────────
  fastify.get('/suggestions', async (req, reply) => {
    const { status = 'pending' } = req.query;
    const result = await query(
      `SELECT * FROM morpheus_suggestions WHERE status = $1 ORDER BY priority DESC, created_at DESC`,
      [status]
    );
    return reply.send({ suggestions: result.rows });
  });

  fastify.patch('/suggestions/:id/approve', async (req, reply) => {
    await query(`UPDATE morpheus_suggestions SET status = 'accepted', reviewed_at = NOW() WHERE id = $1`, [req.params.id]);
    return reply.send({ ok: true, id: req.params.id, status: 'accepted' });
  });

  fastify.patch('/suggestions/:id/reject', async (req, reply) => {
    await query(`UPDATE morpheus_suggestions SET status = 'rejected', reviewed_at = NOW() WHERE id = $1`, [req.params.id]);
    return reply.send({ ok: true, id: req.params.id, status: 'rejected' });
  });

  // ── Winning Assets ────────────────────────────
  fastify.get('/assets', async (req, reply) => {
    const { type, engine } = req.query;
    const list = await assets.list({ type, engine });
    return reply.send({ assets: list });
  });

  fastify.get('/assets/summary', async (req, reply) => {
    const summary = await assets.summary();
    return reply.send({ summary });
  });

  fastify.post('/assets', async (req, reply) => {
    const { type, name, engine, context, content, metadata } = req.body;
    if (!type || !name || !content) return reply.code(400).send({ error: 'type, name, content required' });
    const asset = await assets.create({ type, name, engine, context, content, metadata });
    return reply.code(201).send({ asset });
  });

  fastify.patch('/assets/:id/outcome', async (req, reply) => {
    const { won } = req.body;
    if (won === undefined) return reply.code(400).send({ error: 'won (boolean) required' });
    await assets.recordOutcome(parseInt(req.params.id), won);
    return reply.send({ ok: true });
  });

  // ── SOPs ──────────────────────────────────────
  fastify.get('/sops', async (req, reply) => {
    const { engine } = req.query;
    const list = await sopLib.list(engine || null);
    return reply.send({ sops: list });
  });

  fastify.put('/sops', async (req, reply) => {
    const { name, engine, steps } = req.body;
    if (!name || !steps) return reply.code(400).send({ error: 'name and steps required' });
    const sop = await sopLib.upsert({ name, engine, steps });
    return reply.send({ sop });
  });

  // ── Engine Runs ───────────────────────────────
  fastify.get('/runs', async (req, reply) => {
    const { engine, limit = 20 } = req.query;
    const params = engine ? [engine, parseInt(limit)] : [parseInt(limit)];
    const where  = engine ? 'WHERE engine = $1' : '';
    const limitP = engine ? '$2' : '$1';
    const result = await query(
      `SELECT * FROM engine_runs ${where} ORDER BY started_at DESC LIMIT ${limitP}`,
      params
    );
    return reply.send({ runs: result.rows });
  });

  // ── Dashboard summary — everything in one call ─
  fastify.get('/dashboard', async (req, reply) => {
    const [snapshots, assetSummary, suggestions, recentRuns, revenue] = await Promise.all([
      kpiStore.getAllHistory(1),
      assets.summary(),
      query(`SELECT * FROM morpheus_suggestions WHERE status = 'pending' ORDER BY priority DESC LIMIT 5`),
      query(`SELECT * FROM engine_runs ORDER BY started_at DESC LIMIT 8`),
      query(`SELECT COALESCE(SUM(amount_gbp),0) AS total,
                    COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_count
             FROM revenue_events`)
    ]);

    return reply.send({
      kpi_today:          snapshots,
      asset_summary:      assetSummary,
      pending_suggestions: suggestions.rows,
      recent_engine_runs: recentRuns.rows,
      revenue:            revenue.rows[0]
    });
  });
}

module.exports = kpiRoutes;
