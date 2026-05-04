const axios = require('axios');
const crypto = require('crypto');

const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN_MORPHEUS;
const ADMIN_CHAT  = process.env.TRINITY_ADMIN_CHAT_ID;
const MORPHEUS_URL = process.env.MORPHEUS_API_URL || 'http://51.79.29.15:19000';
const MORPHEUS_KEY = process.env.MORPHEUS_API_KEY;
const RESEND_SIGNING_SECRET = process.env.RESEND_WEBHOOK_SECRET;

const ovhHeaders = () => ({ 'X-API-Key': MORPHEUS_KEY, 'Content-Type': 'application/json' });

// Verify Resend webhook signature (svix-style)
const verifySignature = (rawBody, headers) => {
  if (!RESEND_SIGNING_SECRET) return true; // skip in dev if not set
  try {
    const msgId        = headers['svix-id'];
    const msgTimestamp = headers['svix-timestamp'];
    const msgSignature = headers['svix-signature'];
    if (!msgId || !msgTimestamp || !msgSignature) return false;

    const toSign = `${msgId}.${msgTimestamp}.${rawBody}`;
    const secret = Buffer.from(RESEND_SIGNING_SECRET.replace(/^whsec_/, ''), 'base64');
    const hmac   = crypto.createHmac('sha256', secret).update(toSign).digest('base64');
    const expected = `v1,${hmac}`;
    return msgSignature.split(' ').some(sig => sig === expected);
  } catch {
    return false;
  }
};

const EMOJI = {
  'email.sent':             '📨',
  'email.delivered':        '✅',
  'email.delivery_delayed': '⏳',
  'email.opened':           '👁',
  'email.clicked':          '🖱',
  'email.bounced':          '⚠️',
  'email.complained':       '🚨',
};

const tgAlert = async (text) => {
  if (!BOT_TOKEN || !ADMIN_CHAT) return;
  await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    { chat_id: ADMIN_CHAT, text, parse_mode: 'Markdown' },
    { timeout: 8000 }
  ).catch(() => {});
};

const logToOvh = async (eventType, emailId, to) => {
  await axios.post(
    `${MORPHEUS_URL}/api/morpheus/message`,
    {
      message: `OUTREACH_LOG: action=${eventType} email_id=${emailId} to=${to} ts=${new Date().toISOString()}`,
      session_id: `resend_event_${Date.now()}`,
    },
    { headers: ovhHeaders(), timeout: 10000 }
  ).catch(() => {});
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Collect raw body for signature verification
  const rawBody = JSON.stringify(req.body);

  if (!verifySignature(rawBody, req.headers)) {
    console.warn('[RESEND WEBHOOK] Signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { type, data } = req.body || {};
  if (!type || !data) return res.status(200).json({ ok: true });

  const emailId  = data.email_id || data.id || '—';
  const to       = (data.to && data.to[0]) || data.email_address || '—';
  const subject  = data.subject || '—';
  const clickUrl = data.click?.link || null;
  const emoji    = EMOJI[type] || '📧';

  console.log(`[RESEND EVENT] ${type} | ${emailId} | ${to}`);

  // Build Telegram alert based on event type
  let alertText = null;

  if (type === 'email.opened') {
    alertText = [
      `${emoji} *EMAIL OPENED*`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `ID: \`${emailId}\``,
      `\n_They're looking. Follow up within the hour._`,
    ].join('\n');
  } else if (type === 'email.clicked') {
    alertText = [
      `${emoji} *LINK CLICKED*`,
      `To: ${to}`,
      `Subject: ${subject}`,
      clickUrl ? `Link: ${clickUrl}` : null,
      `ID: \`${emailId}\``,
      `\n_Hot lead — they clicked the preview. Reply now._`,
    ].filter(Boolean).join('\n');
  } else if (type === 'email.bounced') {
    alertText = [
      `${emoji} *BOUNCE — email not delivered*`,
      `To: ${to}`,
      `Reason: ${data.bounce?.message || 'unknown'}`,
      `ID: \`${emailId}\``,
    ].join('\n');
  } else if (type === 'email.complained') {
    alertText = [
      `🚨 *SPAM COMPLAINT*`,
      `To: ${to}`,
      `ID: \`${emailId}\``,
      `\n_Remove from outreach list immediately._`,
    ].join('\n');
  } else if (type === 'email.delivery_delayed') {
    alertText = [
      `${emoji} *DELIVERY DELAYED*`,
      `To: ${to}`,
      `ID: \`${emailId}\``,
    ].join('\n');
  }

  // Fire alert + log in parallel, don't block response
  await Promise.allSettled([
    alertText ? tgAlert(alertText) : Promise.resolve(),
    logToOvh(type.replace('email.', ''), emailId, to),
  ]);

  return res.status(200).json({ ok: true });
};
