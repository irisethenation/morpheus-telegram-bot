'use strict';

const db       = require('../services/db');
const revenue  = require('../models/revenue');
const leadModel = require('../models/lead');
const orchestrator = require('../agents/orchestrator');

const AGENT_NAMES = ['morpheus', 'trinity', 'phoenix', 'creator', 'sentinel', 'sigma', 'kappa', 'mapondera'];

async function statusRoutes(fastify) {
  // Full system health — used by command centre dashboard
  fastify.get('/', async (_req, reply) => {
    const [revenueSummary, recentLeads] = await Promise.all([
      revenue.summary().catch(() => null),
      leadModel.list({ limit: 5 }).catch(() => [])
    ]);

    const agents = AGENT_NAMES.map((name) => ({
      name,
      status: orchestrator.getAgent(name) ? 'online' : 'offline'
    }));

    return reply.send({
      status:    'operational',
      timestamp: new Date().toISOString(),
      agents,
      revenue:   revenueSummary,
      recent_leads_count: recentLeads.length
    });
  });

  // Lightweight liveness probe — for OVH monitoring
  fastify.get('/health', async (_req, reply) => {
    try {
      await db.query('SELECT 1');
      return reply.send({ ok: true, db: 'connected', timestamp: new Date().toISOString() });
    } catch {
      return reply.code(503).send({ ok: false, db: 'disconnected' });
    }
  });
}

module.exports = statusRoutes;
