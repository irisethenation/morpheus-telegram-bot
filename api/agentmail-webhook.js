const { handleInboundReply } = require('./revenue/agentmail');

// Receives inbound email notifications from AgentMail
// Register this URL in AgentMail dashboard → Webhooks → New webhook
// Event: email.received
//
// AgentMail sends a POST when someone replies to an outreach email.
// We parse the reply, detect intent (hot / unsubscribe / neutral),
// and fire a Telegram alert.

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = req.body;
  if (!body) return res.status(400).json({ error: 'Empty body' });

  // AgentMail wraps the email in an event object
  const email = body.email || body.data || body;

  if (!email?.from && !email?.id) {
    return res.status(400).json({ error: 'Unrecognised payload structure' });
  }

  try {
    const result = await handleInboundReply(email);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('[AGENTMAIL WEBHOOK ERROR]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
