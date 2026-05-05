const axios = require('axios');

const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN_MORPHEUS;
const ADMIN_CHAT  = process.env.TRINITY_ADMIN_CHAT_ID;
const MORPHEUS_URL = process.env.MORPHEUS_API_URL || 'http://51.79.29.15:19000';
const MORPHEUS_KEY = process.env.MORPHEUS_API_KEY;

const tg = async (text) => {
  if (!BOT_TOKEN || !ADMIN_CHAT) return;
  await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    { chat_id: ADMIN_CHAT, text, parse_mode: 'Markdown' },
    { timeout: 8000 }
  ).catch(e => console.error('[EVENT_BUS TG]', e.message));
};

const ovhLog = async (eventType, payload) => {
  await axios.post(
    `${MORPHEUS_URL}/api/morpheus/message`,
    {
      message: `PAYMENT_EVENT: type=${eventType} ${JSON.stringify(payload)}`,
      session_id: `payment_event_${Date.now()}`,
    },
    { headers: { 'X-API-Key': MORPHEUS_KEY, 'Content-Type': 'application/json' }, timeout: 10000 }
  ).catch(e => console.error('[EVENT_BUS OVH]', e.message));
};

const TEMPLATES = {
  'payment.received': (d) => [
    `💰 *PAYMENT RECEIVED*`,
    ``,
    `Amount: *£${Number(d.amount).toLocaleString()}*`,
    `Reference: \`${d.reference || '—'}\``,
    `Invoice: \`${d.invoice_id}\``,
    `Confidence: *${d.confidence}%* (${d.match_type})`,
    d.client_name ? `Client: ${d.client_name}` : null,
    ``,
    `_Agents triggered. Revenue locked._`,
  ].filter(Boolean).join('\n'),

  'payment.unmatched': (d) => [
    `⚠️ *UNMATCHED PAYMENT*`,
    ``,
    `Amount: £${Number(d.amount).toLocaleString()}`,
    `Reference: \`${d.reference || '—'}\``,
    `Sender: ${d.sender_name || '—'}`,
    `Provider: ${d.provider || '—'}`,
    `TX ID: \`${d.id}\``,
    ``,
    `_No invoice found. Use /match to link manually._`,
  ].filter(Boolean).join('\n'),

  'payment.duplicate': (d) => [
    `🔄 *DUPLICATE TX BLOCKED*`,
    `TX: \`${d.id}\` — already processed.`,
  ].join('\n'),

  'invoice.created': (d) => [
    `🧾 *INVOICE CREATED*`,
    ``,
    `Reference: \`${d.reference}\``,
    `Amount: £${Number(d.amount).toLocaleString()} ${d.currency}`,
    d.client_name  ? `Client: ${d.client_name}` : null,
    d.client_email ? `Email: ${d.client_email}` : null,
    d.description  ? `Description: ${d.description}` : null,
    ``,
    `_Tell the client to use reference \`${d.reference}\` on their bank transfer._`,
  ].filter(Boolean).join('\n'),
};

const emitEvent = async (eventType, data) => {
  console.log(`[EVENT] ${eventType}`, data);

  const template = TEMPLATES[eventType];
  const alertText = template ? template(data) : `📡 *${eventType.toUpperCase()}*\n${JSON.stringify(data, null, 2).slice(0, 300)}`;

  await Promise.allSettled([
    tg(alertText),
    ovhLog(eventType, data),
  ]);
};

module.exports = { emitEvent };
