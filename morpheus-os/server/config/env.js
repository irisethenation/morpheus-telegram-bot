'use strict';

require('dotenv').config();

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
};

const optional = (key, fallback = '') => process.env[key] || fallback;

module.exports = {
  server: {
    port: parseInt(optional('PORT', '3000'), 10),
    host: optional('HOST', '0.0.0.0'),
    env:  optional('NODE_ENV', 'development')
  },
  pg: {
    host:     optional('PG_HOST', 'localhost'),
    port:     parseInt(optional('PG_PORT', '5432'), 10),
    database: optional('PG_DATABASE', 'morpheus'),
    user:     optional('PG_USER', 'morpheus'),
    password: optional('PG_PASSWORD', '')
  },
  redis: {
    host:     optional('REDIS_HOST', 'localhost'),
    port:     parseInt(optional('REDIS_PORT', '6379'), 10),
    password: optional('REDIS_PASSWORD', '') || undefined
  },
  anthropic: {
    apiKey: optional('ANTHROPIC_API_KEY')
  },
  telegram: {
    morpheusToken: optional('TELEGRAM_BOT_TOKEN_MORPHEUS'),
    trinityToken:  optional('TELEGRAM_BOT_TOKEN_TRINITY')
  },
  auth: {
    internalSecret: optional('INTERNAL_API_SECRET', 'dev-secret-change-in-production')
  },
  stripe: {
    secretKey: optional('STRIPE_SECRET_KEY')
  },
  brevo: {
    apiKey: optional('BREVO_API_KEY')
  },
  origins: {
    wepayCash:  optional('WEPAY_CASH_ORIGIN',  'https://wepaycash.co.uk'),
    gemAgency:  optional('GEM_AGENCY_ORIGIN',   'https://gemagency.co.uk')
  }
};
