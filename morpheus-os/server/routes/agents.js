'use strict';

const orchestrator = require('../agents/orchestrator');
const agentTask    = require('../models/agentTask');
const eventBus     = require('../services/eventBus');
const { CHANNELS } = require('../services/eventBus');
const { v4: uuidv4 } = require('uuid');

const AGENT_NAMES = ['morpheus', 'trinity', 'phoenix', 'creator', 'sentinel', 'sigma', 'kappa', 'mapondera'];

async function agentsRoutes(fastify) {
  // List all registered agents and their status
  fastify.get('/', async (_req, reply) => {
    const agents = AGENT_NAMES.map((name) => ({
      name,
      registered: !!orchestrator.getAgent(name),
      status: orchestrator.getAgent(name) ? 'online' : 'offline'
    }));
    return reply.send({ agents });
  });

  // Manually dispatch a task to a specific agent (command centre use)
  fastify.post('/:agent/dispatch', async (req, reply) => {
    const { agent } = req.params;
    if (!AGENT_NAMES.includes(agent)) {
      return reply.code(400).send({ error: `Unknown agent: ${agent}` });
    }

    const { task_type, user_id = 0, user_name = 'Operator', chat_id = 0, data = {} } = req.body;
    if (!task_type) return reply.code(400).send({ error: 'task_type required' });

    const result = await orchestrator.dispatch({
      task_uuid:     uuidv4(),
      agent,
      task_type,
      dispatched_by: 'command-centre',
      user_id,
      user_name,
      chat_id,
      data
    });

    return reply.code(202).send({ ok: true, ...result });
  });

  // Get task status by UUID
  fastify.get('/tasks/:uuid', async (req, reply) => {
    const task = await agentTask.findByUuid(req.params.uuid);
    if (!task) return reply.code(404).send({ error: 'Task not found' });
    return reply.send({ task });
  });

  // Broadcast a system alert to all agents
  fastify.post('/broadcast', async (req, reply) => {
    const { type, message } = req.body;
    if (!type) return reply.code(400).send({ error: 'type required' });

    await eventBus.publish(CHANNELS.SYSTEM_ALERT, {
      type, message, timestamp: new Date().toISOString(), source: 'command-centre'
    });

    return reply.send({ ok: true, type });
  });
}

module.exports = agentsRoutes;
