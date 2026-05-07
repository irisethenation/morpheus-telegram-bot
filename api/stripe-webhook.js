const crypto = require('crypto');
const { processTransaction } = require('./payments/decisionEngine');

// DORMANT — activates when STRIPE_WEBHOOK_SECRET is added to Vercel env vars.
//
// Handles BOTH Stripe payload styles:
//
//  SNAPSHOT (traditional default):
//    event.data.object = full Stripe object with all fields inline
//    event.data.object.amount, .metadata, .currency etc. present
//
//  THIN (new Stripe Event Destinations / API 2022-11-15+):
//    event.data = { id: "pi_xxx", object: "payment_intent" } — minimal reference
//    event.data.object is absent or minimal (no amount/metadata)
//    Requires fetching full object from Stripe API, OR matching on available fields
//
// To enable snapshot payloads in Stripe Dashboard:
//   Dashboard → Developers → Webhooks → your endpoint → "Send snapshot data"

const STRIPE_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe signature verification — timestamp + v1 HMAC
const verifyStripeSignature = (rawBody, sigHeader, secret) => {
  if (!secret) return true; // dormant: accept all until secret is configured
  if (!sigHeader) return false;
  try {
    const parts     = sigHeader.split(',').reduce((acc, p) => { const [k,v] = p.split('='); acc[k]=v; return acc; }, {});
    const timestamp = parts.t;
    const expected  = parts.v1;
    if (!timestamp || !expected) return false;
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false; // replay > 5min
    const computed = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expected));
  } catch { return false; }
};

// ── PAYLOAD DETECTION ─────────────────────────────────────────────────────────
// Returns true if this is a full snapshot object (has amount or metadata fields)
const isSnapshot = (obj) =>
  obj &&
  typeof obj === 'object' &&
  (obj.amount !== undefined || obj.amount_total !== undefined || obj.metadata !== undefined || obj.currency !== undefined);

// ── EXTRACT PAYMENT DATA FROM EITHER PAYLOAD STYLE ───────────────────────────
const extractPaymentData = (event) => {
  const type = event.type;

  // ── payment_intent.succeeded ────────────────────────────────────────────────
  if (type === 'payment_intent.succeeded') {

    // SNAPSHOT: event.data.object is a full PaymentIntent
    if (isSnapshot(event.data?.object)) {
      const pi = event.data.object;
      return {
        id:          pi.id,
        provider:    'stripe',
        amount:      Number(pi.amount) / 100,
        currency:    (pi.currency || 'GBP').toUpperCase(),
        reference:   (pi.metadata?.reference || pi.description || pi.statement_descriptor || '').toUpperCase().trim(),
        sender_name: pi.metadata?.client_name || pi.receipt_email || null,
        sender_ref:  pi.metadata?.reference || null,
        raw:         event,
        _payload:    'snapshot',
      };
    }

    // THIN: event.data is the minimal object reference (id + type only)
    // event.data.object may be absent; minimal fields may exist on event.data itself
    const piRef = event.data?.object && typeof event.data.object === 'object'
      ? event.data.object  // thin: object key exists but minimal
      : event.data;        // thin: data IS the reference

    const piId = piRef?.id || event.data?.id;
    if (!piId) return null;

    return {
      id:          piId,
      provider:    'stripe',
      amount:      piRef?.amount ? Number(piRef.amount) / 100 : 0,
      currency:    (piRef?.currency || 'GBP').toUpperCase(),
      reference:   (piRef?.metadata?.reference || piRef?.description || '').toUpperCase().trim(),
      sender_name: piRef?.metadata?.client_name || null,
      sender_ref:  piRef?.metadata?.reference || null,
      raw:         event,
      _payload:    'thin',
    };
  }

  // ── checkout.session.completed ──────────────────────────────────────────────
  if (type === 'checkout.session.completed') {

    // SNAPSHOT
    if (isSnapshot(event.data?.object)) {
      const cs = event.data.object;
      return {
        id:          cs.payment_intent || cs.id,
        provider:    'stripe',
        amount:      Number(cs.amount_total) / 100,
        currency:    (cs.currency || 'GBP').toUpperCase(),
        reference:   (cs.metadata?.reference || cs.client_reference_id || '').toUpperCase().trim(),
        sender_name: cs.customer_details?.name || null,
        sender_ref:  cs.metadata?.reference || null,
        raw:         event,
        _payload:    'snapshot',
      };
    }

    // THIN
    const csRef = event.data?.object && typeof event.data.object === 'object'
      ? event.data.object
      : event.data;

    return {
      id:          csRef?.payment_intent || csRef?.id || event.data?.id,
      provider:    'stripe',
      amount:      csRef?.amount_total ? Number(csRef.amount_total) / 100 : 0,
      currency:    (csRef?.currency || 'GBP').toUpperCase(),
      reference:   (csRef?.metadata?.reference || csRef?.client_reference_id || '').toUpperCase().trim(),
      sender_name: csRef?.customer_details?.name || null,
      sender_ref:  csRef?.metadata?.reference || null,
      raw:         event,
      _payload:    'thin',
    };
  }

  // ── charge.succeeded (older Stripe integrations) ────────────────────────────
  if (type === 'charge.succeeded') {
    const ch = isSnapshot(event.data?.object) ? event.data.object : event.data;
    return {
      id:          ch?.payment_intent || ch?.id,
      provider:    'stripe',
      amount:      ch?.amount ? Number(ch.amount) / 100 : 0,
      currency:    (ch?.currency || 'GBP').toUpperCase(),
      reference:   (ch?.metadata?.reference || ch?.description || '').toUpperCase().trim(),
      sender_name: ch?.metadata?.client_name || ch?.billing_details?.name || null,
      sender_ref:  ch?.metadata?.reference || null,
      raw:         event,
      _payload:    isSnapshot(event.data?.object) ? 'snapshot' : 'thin',
    };
  }

  return null; // unhandled event type
};

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const rawBody = JSON.stringify(req.body);
  const sig     = req.headers['stripe-signature'];

  if (!verifyStripeSignature(rawBody, sig, STRIPE_SECRET)) {
    console.warn('[STRIPE] Signature verification failed');
    return res.status(401).json({ error: 'Invalid Stripe signature' });
  }

  const event = req.body;
  if (!event?.type) return res.status(400).json({ error: 'Missing event type' });

  const HANDLED_TYPES = [
    'payment_intent.succeeded',
    'checkout.session.completed',
    'charge.succeeded',
  ];

  if (!HANDLED_TYPES.includes(event.type)) {
    return res.status(200).json({ received: true, processed: false, type: event.type });
  }

  const tx = extractPaymentData(event);
  if (!tx || !tx.id) {
    console.warn('[STRIPE] Could not extract payment data from event', event.type, event.id);
    return res.status(200).json({ received: true, processed: false, reason: 'no_payment_data' });
  }

  console.log(`[STRIPE] ${event.type} | payload=${tx._payload} | id=${tx.id} | amount=${tx.amount} | ref=${tx.reference || '—'}`);

  // Thin payload warning — fuzzy match will kick in (lower confidence)
  if (tx._payload === 'thin' && !tx.reference) {
    console.warn('[STRIPE] Thin payload with no reference — matching will rely on amount + time proximity');
  }

  try {
    const result = await processTransaction(tx);
    return res.status(200).json({ received: true, payload: tx._payload, ...result });
  } catch (err) {
    console.error('[STRIPE WEBHOOK ERROR]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
