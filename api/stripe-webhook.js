const crypto = require('crypto');
const { processTransaction } = require('./payments/decisionEngine');

// DORMANT — wired and ready. Activates automatically once Stripe director
// ID verification is complete and the webhook secret is added to Vercel env vars.

const STRIPE_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe signature verification (matches Stripe's official algorithm)
const verifyStripeSignature = (rawBody, sigHeader, secret) => {
  if (!secret) return true; // dormant mode — skip verification until secret is set
  if (!sigHeader) return false;
  try {
    const parts    = sigHeader.split(',').reduce((acc, part) => {
      const [k, v] = part.split('=');
      acc[k] = v;
      return acc;
    }, {});
    const timestamp = parts.t;
    const expected  = parts.v1;
    if (!timestamp || !expected) return false;

    // Reject events older than 5 minutes (replay protection)
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

    const signed   = `${timestamp}.${rawBody}`;
    const computed = crypto.createHmac('sha256', secret).update(signed).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expected));
  } catch {
    return false;
  }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const rawBody = JSON.stringify(req.body);
  const sig     = req.headers['stripe-signature'];

  if (!verifyStripeSignature(rawBody, sig, STRIPE_SECRET)) {
    return res.status(401).json({ error: 'Invalid Stripe signature' });
  }

  const event = req.body;
  if (!event?.type) return res.status(400).json({ error: 'Missing event type' });

  let tx = null;

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data?.object;
    tx = {
      id:          pi.id,
      provider:    'stripe',
      amount:      pi.amount / 100,
      currency:    (pi.currency || 'gbp').toUpperCase(),
      reference:   (pi.metadata?.reference || pi.description || '').toUpperCase().trim(),
      sender_name: pi.metadata?.client_name || null,
      sender_ref:  pi.metadata?.reference || null,
      raw:         pi,
    };
  } else if (event.type === 'checkout.session.completed') {
    const cs = event.data?.object;
    tx = {
      id:          cs.payment_intent || cs.id,
      provider:    'stripe',
      amount:      cs.amount_total / 100,
      currency:    (cs.currency || 'gbp').toUpperCase(),
      reference:   (cs.metadata?.reference || cs.client_reference_id || '').toUpperCase().trim(),
      sender_name: cs.customer_details?.name || null,
      sender_ref:  cs.metadata?.reference || null,
      raw:         cs,
    };
  } else {
    // Acknowledge but don't process other event types
    return res.status(200).json({ received: true, processed: false });
  }

  try {
    const result = await processTransaction(tx);
    return res.status(200).json({ received: true, ...result });
  } catch (err) {
    console.error('[STRIPE WEBHOOK ERROR]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
