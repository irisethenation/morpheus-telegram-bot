'use strict';

const eventModel = require('../models/event');

async function eventsRoutes(fastify) {
  // List agent events — used by command centre dashboard
  fastify.get('/', async (req, reply) => {
    const { agent, leadId, limit = 100, offset = 0 } = req.query;
    const events = await eventModel.list({
      agentName: agent,
      leadId:    leadId ? parseInt(leadId) : undefined,
      limit:     parseInt(limit),
      offset:    parseInt(offset)
    });
    return reply.send({ events, count: events.length });
  });
}

module.exports = eventsRoutes;
