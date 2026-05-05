'use strict';

const { z } = require('zod');
const orchestrator = require('../agents/orchestrator');
const env = require('../config/env');

const dispatchSchema = z.object({
  task_uuid:     z.string().uuid(),
  agent:         z.enum(['morpheus', 'trinity', 'phoenix', 'creator', 'sentinel', 'sigma', 'kappa', 'mapondera']),
  task_type:     z.string().min(1),
  dispatched_by: z.string().optional(),
  user_id:       z.number().or(z.string()),
  user_name:     z.string(),
  chat_id:       z.number().or(z.string()),
  timestamp:     z.string().optional(),
  data:          z.record(z.unknown()).optional()
});

async function webhookRoutes(fastify) {
  // Auth middleware — validates shared secret from Telegram bot
  fastify.addHook('preHandler', async (req, reply) => {
    const secret = req.headers['x-internal-secret'];
    if (secret !== env.auth.internalSecret) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Agent dispatch — called by morpheus-telegram-bot
  fastify.post('/dispatch', async (req, reply) => {
    const parse = dispatchSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({ error: 'Invalid payload', details: parse.error.flatten() });
    }

    const result = await orchestrator.dispatch(parse.data);
    return reply.code(202).send({ ok: true, ...result });
  });

  // Health ping from Telegram bot
  fastify.get('/ping', async (_req, reply) => {
    return reply.send({ status: 'morpheus-online', timestamp: new Date().toISOString() });
  });
}

module.exports = webhookRoutes;
