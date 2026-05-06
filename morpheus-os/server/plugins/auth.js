'use strict';

const fp  = require('fastify-plugin');
const env = require('../config/env');

// Routes that bypass internal-secret auth (they verify their own way)
const PUBLIC_PREFIXES = [
  '/api/inbound',   // Twilio sig, VAPI, Stripe sig, Brevo
  '/api/health',
  '/api/status'
];

function isPublic(url) {
  return PUBLIC_PREFIXES.some((prefix) => url.startsWith(prefix));
}

async function authPlugin(fastify) {
  fastify.addHook('onRequest', async (req, reply) => {
    if (isPublic(req.url)) return;

    const secret = req.headers['x-internal-secret'];
    if (!secret || secret !== env.auth.internalSecret) {
      reply.code(401).send({ error: 'Unauthorized — x-internal-secret required' });
    }
  });
}

module.exports = fp(authPlugin, { name: 'auth' });
