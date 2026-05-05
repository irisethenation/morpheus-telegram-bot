const crypto = require('crypto');
const { processTransaction } = require('./payments/decisionEngine');

// Tide does not have native webhooks (as of 2026).
// This endpoint is called by one of:
//   a) A cron job on OVH that polls Tide's Open Banking API and POSTs here
//   b) A Zapier/n8n workflow connected to Tide
//   c) Open Banking / PSD2 notification forwarding
//
// Expected POST body (normalised):
//   { id, amount, currency, reference, sender_name, sender_ref, raw }

const TIDE_WEBHOOK_SECRET = process.env.TIDE_WEBHOOK_SECRET;

const verifyHmac = (rawBody, sigHeader) => {
  if (!TIDE_WEBHOOK_SECRET) return true; // skip if not configured
  if (!sigHeader) return false;
  const expected = crypto
    .createHmac('sha256', TIDE_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const rawBody = JSON.stringify(req.body);
  const sig     = req.headers['x-tide-signature'] || req.headers['x-webhook-signature'];

  if (!verifyHmac(rawBody, sig)) {
    console.warn('[TIDE WEBHOOK] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const body = req.body;
  if (!body?.id || body?.amount === undefined) {
    return res.status(400).json({ error: 'Missing id or amount' });
  }

  const tx = {
    id:          String(body.id),
    provider:    'tide',
    amount:      Number(body.amount),
    currency:    body.currency || 'GBP',
    reference:   (body.reference || body.payment_reference || '').toUpperCase().trim(),
    sender_name: body.sender_name || body.counterparty_name || null,
    sender_ref:  body.sender_ref  || body.narrative || null,
    raw:         body,
  };

  try {
    const result = await processTransaction(tx);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('[TIDE WEBHOOK ERROR]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
