'use strict';

const fastify = require('fastify')({ logger: true, trustProxy: true });
const env     = require('./config/env');

// ─── Body parsing ──────────────────────────────────────────────────────
// Capture rawBody on every request so Stripe webhook signature
// verification works, while still giving req.body parsed JSON to all routes.
fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  req.rawBody = body;
  try {
    done(null, JSON.parse(body.toString('utf8')));
  } catch (e) {
    done(e);
  }
});

// Twilio posts form-encoded data — required for inbound SMS/voice routes
fastify.register(require('@fastify/formbody'));

// ─── Security & performance ────────────────────────────────────────────
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

// ─── Auth (x-internal-secret on all routes except /api/inbound + /api/health) ──
fastify.register(require('./plugins/auth'));

// ─── Routes — internal ─────────────────────────────────────────────────
fastify.register(require('./routes/webhook'),  { prefix: '/api/agent' });
fastify.register(require('./routes/leads'),    { prefix: '/api/leads' });
fastify.register(require('./routes/events'),   { prefix: '/api/events' });
fastify.register(require('./routes/agents'),   { prefix: '/api/agents' });
fastify.register(require('./routes/pipeline'), { prefix: '/api/pipeline' });
fastify.register(require('./routes/kpi'),      { prefix: '/api/kpi' });
fastify.register(require('./routes/status'),   { prefix: '/api' });

// ─── Routes — inbound webhooks (public, self-verifying) ────────────────
fastify.register(require('./routes/inbound'), { prefix: '/api/inbound' });

module.exports = fastify;
