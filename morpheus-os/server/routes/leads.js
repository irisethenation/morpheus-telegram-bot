'use strict';

const leadModel = require('../models/lead');
const agentTask = require('../models/agentTask');
const revenue   = require('../models/revenue');
const eventBus  = require('../services/eventBus');
const { CHANNELS } = require('../services/eventBus');

async function leadsRoutes(fastify) {
  // List all leads
  fastify.get('/', async (req, reply) => {
    const { limit = 50, offset = 0, status } = req.query;
    const leads = await leadModel.list({ limit: parseInt(limit), offset: parseInt(offset), status });
    return reply.send({ leads, count: leads.length });
  });

  // Get single lead with tasks and revenue
  fastify.get('/:id', async (req, reply) => {
    const lead = await leadModel.findById(req.params.id);
    if (!lead) return reply.code(404).send({ error: 'Lead not found' });

    const [tasks, payments] = await Promise.all([
      agentTask.listByLead(lead.id),
      revenue.listByLead(lead.id)
    ]);

    return reply.send({ lead, tasks, payments });
  });

  // Update lead status
  fastify.patch('/:telegramUserId/status', async (req, reply) => {
    const { status } = req.body;
    if (!status) return reply.code(400).send({ error: 'status required' });

    const lead = await leadModel.updateStatus(req.params.telegramUserId, status);
    if (!lead) return reply.code(404).send({ error: 'Lead not found' });

    await eventBus.publish(CHANNELS.LEAD_UPDATED, { telegramUserId: req.params.telegramUserId, status });
    return reply.send({ lead });
  });
}

module.exports = leadsRoutes;
