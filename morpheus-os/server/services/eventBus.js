'use strict';

const Redis = require('ioredis');
const env = require('../config/env');

const redisOptions = {
  host:            env.redis.host,
  port:            env.redis.port,
  password:        env.redis.password,
  retryStrategy:   (times) => Math.min(times * 200, 5000),
  enableReadyCheck: true,
  lazyConnect:     true
};

// Separate clients: one for pub, one for sub (Redis restriction)
const publisher  = new Redis(redisOptions);
const subscriber = new Redis(redisOptions);

publisher.on('error',  (e) => console.error('[REDIS PUB]', e.message));
subscriber.on('error', (e) => console.error('[REDIS SUB]', e.message));

const handlers = new Map();

subscriber.on('message', (channel, raw) => {
  try {
    const payload = JSON.parse(raw);
    const fns = handlers.get(channel) || [];
    fns.forEach((fn) => fn(payload));
  } catch (e) {
    console.error('[EVENT BUS] Parse error on channel', channel, e.message);
  }
});

async function connect() {
  await publisher.connect();
  await subscriber.connect();
  console.log('[EVENT BUS] Redis connected');
}

async function publish(channel, payload) {
  await publisher.publish(channel, JSON.stringify(payload));
}

function subscribe(channel, handler) {
  if (!handlers.has(channel)) {
    handlers.set(channel, []);
    subscriber.subscribe(channel);
  }
  handlers.get(channel).push(handler);
}

function unsubscribe(channel, handler) {
  const fns = handlers.get(channel) || [];
  const filtered = fns.filter((fn) => fn !== handler);
  if (filtered.length === 0) {
    handlers.delete(channel);
    subscriber.unsubscribe(channel);
  } else {
    handlers.set(channel, filtered);
  }
}

// Channel name constants — keeps channel names consistent across codebase
const CHANNELS = {
  AGENT_DISPATCH:  'morpheus:agent:dispatch',
  AGENT_RESULT:    'morpheus:agent:result',
  LEAD_CREATED:    'morpheus:lead:created',
  LEAD_UPDATED:    'morpheus:lead:updated',
  PAYMENT_EVENT:   'morpheus:payment:event',
  SYSTEM_ALERT:    'morpheus:system:alert',
  TELEGRAM_SEND:   'morpheus:telegram:send'
};

module.exports = { connect, publish, subscribe, unsubscribe, CHANNELS };
