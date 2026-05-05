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

// Routes
fastify.register(require('./routes/webhook'), { prefix: '/api/agent' });
fastify.register(require('./routes/leads'),   { prefix: '/api/leads' });
fastify.register(require('./routes/events'),  { prefix: '/api/events' });
fastify.register(require('./routes/agents'),  { prefix: '/api/agents' });
fastify.register(require('./routes/status'),  { prefix: '/api' });

module.exports = fastify;
