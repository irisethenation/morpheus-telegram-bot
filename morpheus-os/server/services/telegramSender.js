'use strict';

/**
 * Telegram Sender — closes the response loop.
 *
 * Subscribes to the morpheus:telegram:send Redis channel.
 * When an agent publishes a result that needs to reach a user,
 * this service calls the Telegram Bot API directly.
 *
 * Payload shape agents should publish:
 * {
 *   chat_id:    number,
 *   text:       string,
 *   bot:        'morpheus' | 'trinity',   (optional, defaults to 'morpheus')
 *   parse_mode: 'Markdown' | 'HTML',      (optional)
 * }
 */

const axios    = require('axios');
const eventBus = require('./eventBus');
const { CHANNELS } = require('./eventBus');
const env      = require('../config/env');

const BOT_API = 'https://api.telegram.org';

function tokenFor(bot) {
  return bot === 'trinity'
    ? env.telegram.trinityToken
    : env.telegram.morpheusToken;
}

async function sendMessage({ chat_id, text, bot = 'morpheus', parse_mode = 'Markdown' }) {
  const token = tokenFor(bot);
  if (!token || !chat_id || !text) return;

  try {
    await axios.post(`${BOT_API}/bot${token}/sendMessage`, {
      chat_id,
      text:       text.slice(0, 4096), // Telegram message limit
      parse_mode
    });
  } catch (err) {
    console.error(`[TELEGRAM SENDER] Failed to send to ${chat_id}:`, err.response?.data || err.message);
  }
}

function init() {
  eventBus.subscribe(CHANNELS.TELEGRAM_SEND, async (payload) => {
    try {
      await sendMessage(payload);
    } catch (err) {
      console.error('[TELEGRAM SENDER] Handler error:', err.message);
    }
  });

  console.log('[TELEGRAM SENDER] Subscribed to telegram:send channel');
}

module.exports = { init, sendMessage };
