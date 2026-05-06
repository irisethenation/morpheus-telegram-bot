'use strict';

const fastify = require('fastify')({ logger: true, trustProxy: true });
const env = require('./config/env');

// Security & performance plugins
fastify.register(require('@fastify/helmet'));
fastify.register(require('@fastify/cors'), {
  origin: [env.origins.wepayCash, env.origins.gemAgency],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-internal-secret', 'Authorization'],
  credentials: true
});
fastify.register(require('@fastify/rate-limit'), {
  max: 200,
  timeWindow: '1 minute'
});

// Routes — internal (agent-to-agent + command centre)
fastify.register(require('./routes/webhook'),  { prefix: '/api/agent' });
fastify.register(require('./routes/leads'),    { prefix: '/api/leads' });
fastify.register(require('./routes/events'),   { prefix: '/api/events' });
fastify.register(require('./routes/agents'),   { prefix: '/api/agents' });
fastify.register(require('./routes/pipeline'), { prefix: '/api/pipeline' });
fastify.register(require('./routes/kpi'),      { prefix: '/api/kpi' });
fastify.register(require('./routes/status'),   { prefix: '/api' });

// Routes — inbound callbacks (Twilio, VAPI, Stripe, external events)
// Raw body parsing required for Stripe signature verification
fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  req.rawBody = body;
  try { done(null, JSON.parse(body)); } catch (e) { done(e); }
});
fastify.register(require('./routes/inbound'), { prefix: '/api/inbound' });

module.exports = fastify;
