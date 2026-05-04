const axios = require('axios');
const { previewUrl } = require('./revenue/websites');
const { buildOutreachEmail } = require('./revenue/resend');

const MORPHEUS_URL = process.env.MORPHEUS_API_URL || 'http://51.79.29.15:19000';
const MORPHEUS_KEY = process.env.MORPHEUS_API_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_MORPHEUS;
const ADMIN_CHAT_ID = process.env.TRINITY_ADMIN_CHAT_ID;

const ovhHeaders = () => ({ 'X-API-Key': MORPHEUS_KEY, 'Content-Type': 'application/json' });

// Encode minimal lead data into Telegram callback_data (max 64 bytes)
// Format: "a|email|name|biz" — truncated to fit, separator is |
const encodeCallback = (action, email, name, biz) => {
  const safe = s => s.replace(/\|/g, '').replace(/\s+/g, ' ').trim();
  const e = safe(email).substring(0, 36);
  const n = safe(name).substring(0, 10);
  const b = safe(biz || '').substring(0, 10);
  return `${action}|${e}|${n}|${b}`;
};

const sendTelegramApproval = async (lead, emailPreview) => {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) return;

  const { name, business, email, phone, industry, bottleneck } = lead;
  const pvUrl = previewUrl(business || name);

  const text = [
    `🔍 *NEW LEAD — APPROVAL REQUIRED*`,
    ``,
    `👤 ${name}${business ? `  ·  ${business}` : ''}`,
    `🏢 ${industry}`,
    `📧 ${email}`,
    phone ? `📱 ${phone}` : null,
    bottleneck ? `\n💬 _"${bottleneck}"_` : null,
    ``,
    `─────────────────────────`,
    `📨 *DRAFT EMAIL*`,
    `To: ${email}`,
    `Subject: ${emailPreview.subject}`,
    `Preview URL: ${pvUrl}`,
    `─────────────────────────`,
    ``,
    `Tap ✅ to send this email now, or ❌ to skip.`,
  ].filter(l => l !== null).join('\n');

  const inline_keyboard = [[
    { text: '✅ Approve & Send', callback_data: encodeCallback('a', email, name, business || name) },
    { text: '❌ Skip',           callback_data: encodeCallback('s', email, name, business || name) },
    { text: '⏰ Send Tomorrow',  callback_data: encodeCallback('t', email, name, business || name) },
  ]];

  await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      chat_id: ADMIN_CHAT_ID,
      text,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard },
    },
    { timeout: 10000 }
  );
};

const logToOvh = async (lead) => {
  const msg = [
    `GEM_LEAD_RECEIVED:`,
    `name=${lead.name}`,
    `business=${lead.business || ''}`,
    `email=${lead.email}`,
    `phone=${lead.phone || ''}`,
    `industry=${lead.industry}`,
    `bottleneck=${lead.bottleneck || ''}`,
    `source=gemtheagency.com`,
    `status=pending_approval`,
    `ts=${new Date().toISOString()}`,
  ].join(' ');

  await axios.post(
    `${MORPHEUS_URL}/api/morpheus/message`,
    { message: msg, session_id: `gem_lead_${Date.now()}`, context: { type: 'gem_lead', ...lead } },
    { headers: ovhHeaders(), timeout: 15000 }
  );
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, business, email, phone, industry, bottleneck } = req.body || {};

  if (!name || !email || !industry) {
    return res.status(400).json({ error: 'name, email and industry are required' });
  }

  const lead = { name, business: business || '', email, phone: phone || '', industry, bottleneck: bottleneck || '' };
  const pvUrl = previewUrl(business || name);
  const emailPreview = buildOutreachEmail({ name, business: business || name, previewUrl: pvUrl });

  // Always respond to the user immediately — never block on backend ops
  res.status(200).json({ ok: true, message: "Request received — we'll be in touch within 2 hours" });

  // Background: log to OVH + send Telegram approval card
  await Promise.allSettled([
    logToOvh(lead).catch(() => {}),
    sendTelegramApproval(lead, emailPreview).catch(() => {}),
  ]);
};
