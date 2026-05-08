const axios = require('axios');

const AGENTMAIL_KEY = process.env.AGENTMAIL_API_KEY;
const BASE_URL      = 'https://api.agentmail.to/v0';
const BOT_TOKEN     = process.env.TELEGRAM_BOT_TOKEN_MORPHEUS;
const ADMIN_CHAT    = process.env.TRINITY_ADMIN_CHAT_ID;
const MORPHEUS_URL  = process.env.MORPHEUS_API_URL || 'http://51.79.29.15:19000';
const MORPHEUS_KEY  = process.env.MORPHEUS_API_KEY;

const amHeaders = () => ({
  'Authorization': `Bearer ${AGENTMAIL_KEY}`,
  'Content-Type': 'application/json',
});

const tgAlert = async (text) => {
  if (!BOT_TOKEN || !ADMIN_CHAT) return;
  await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    { chat_id: ADMIN_CHAT, text, parse_mode: 'Markdown' },
    { timeout: 8000 }
  ).catch(() => {});
};

// Send an outreach email from the AgentMail inbox
// AgentMail tracks replies natively — no separate tracking setup needed
const sendEmail = async ({ to, subject, html, text: textBody, replyTo }) => {
  if (!AGENTMAIL_KEY) throw new Error('AGENTMAIL_API_KEY not configured');

  const res = await axios.post(
    `${BASE_URL}/emails`,
    { to, subject, html, text: textBody, reply_to: replyTo || undefined },
    { headers: amHeaders(), timeout: 15000 }
  );

  const emailId = res.data?.id;

  // Log to morpheus_core
  axios.post(
    `${MORPHEUS_URL}/api/morpheus/message`,
    {
      message: `OUTREACH_LOG: action=sent provider=agentmail email_id=${emailId} to=${to} subject="${subject}"`,
      session_id: `agentmail_${emailId}`,
    },
    { headers: { 'X-API-Key': MORPHEUS_KEY, 'Content-Type': 'application/json' }, timeout: 10000 }
  ).catch(() => {});

  return { id: emailId, status: 'sent', provider: 'agentmail' };
};

// Read all unread emails from the inbox (reply tracking)
const listUnread = async () => {
  if (!AGENTMAIL_KEY) throw new Error('AGENTMAIL_API_KEY not configured');
  const res = await axios.get(`${BASE_URL}/emails?read=false&limit=50`, {
    headers: amHeaders(), timeout: 10000,
  });
  return res.data?.emails || res.data || [];
};

// Get a single email by ID
const getEmail = async (emailId) => {
  const res = await axios.get(`${BASE_URL}/emails/${emailId}`, {
    headers: amHeaders(), timeout: 10000,
  });
  return res.data;
};

// Mark email as read
const markRead = async (emailId) => {
  await axios.patch(`${BASE_URL}/emails/${emailId}`, { read: true }, {
    headers: amHeaders(), timeout: 8000,
  }).catch(() => {});
};

// Handle an inbound reply — called by agentmail-webhook.js
const handleInboundReply = async (email) => {
  const from    = email.from?.address || email.from || '—';
  const fromName= email.from?.name || '';
  const subject = email.subject || '—';
  const body    = email.text || email.body_text || (email.html || '').replace(/<[^>]+>/g, ' ').slice(0, 500);
  const emailId = email.id;

  // Determine lead intent from reply content
  const lower   = body.toLowerCase();
  const isHot   = /interest|yes|call|book|demo|when|how much|price|cost|available|tell me more/.test(lower);
  const isUnSub = /unsubscribe|remove|stop|opt.?out|not interested/.test(lower);

  let alertText;
  if (isUnSub) {
    alertText = [
      `🚫 *UNSUBSCRIBE REQUEST*`,
      `From: ${fromName} <${from}>`,
      `Subject: ${subject}`,
      `\n_Remove from outreach list._`,
    ].join('\n');
  } else if (isHot) {
    alertText = [
      `🔥 *HOT REPLY — INTERESTED LEAD*`,
      `From: ${fromName} <${from}>`,
      `Subject: ${subject}`,
      ``,
      `💬 _"${body.slice(0, 280).trim()}"_`,
      ``,
      `_Respond within the hour._`,
    ].join('\n');
  } else {
    alertText = [
      `📩 *EMAIL REPLY RECEIVED*`,
      `From: ${fromName} <${from}>`,
      `Subject: ${subject}`,
      ``,
      `💬 _"${body.slice(0, 280).trim()}"_`,
    ].join('\n');
  }

  // Log to OVH + alert Telegram
  await Promise.allSettled([
    tgAlert(alertText),
    axios.post(
      `${MORPHEUS_URL}/api/morpheus/message`,
      {
        message: `OUTREACH_LOG: action=reply_received from=${from} subject="${subject}" hot=${isHot} unsub=${isUnSub} body="${body.slice(0,200)}"`,
        session_id: `agentmail_reply_${emailId}`,
      },
      { headers: { 'X-API-Key': MORPHEUS_KEY, 'Content-Type': 'application/json' }, timeout: 10000 }
    ).catch(() => {}),
  ]);

  await markRead(emailId);
  return { from, isHot, isUnSub };
};

module.exports = { sendEmail, listUnread, getEmail, markRead, handleInboundReply };
