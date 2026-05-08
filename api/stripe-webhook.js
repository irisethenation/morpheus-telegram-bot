const crypto = require('crypto');
const axios  = require('axios');
const { processTransaction } = require('../lib/payments/decisionEngine');

// Handles BOTH Stripe payload styles:
//
//  SNAPSHOT (traditional — recommended):
//    event.data.object = full Stripe object (amount, metadata, currency inline)
//    Enable in Dashboard → Developers → Webhooks → endpoint → "Send snapshot data"
//
//  THIN (new v2 Event Destinations):
//    event.data = { id, object } minimal reference only
//    Falls back to fuzzy matching on amount + time proximity
//
// Also handles Stripe Connect events:
//    account.updated          → KYC/verification status change
//    account.application.authorized → Connect account fully verified → payments live
//    capability.updated       → individual capability (card_payments etc.) enabled/disabled

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

// ── CONNECT ACCOUNT EVENT HANDLERS ───────────────────────────────────────────

const tgAlert = async (text) => {
  const token  = process.env.TELEGRAM_BOT_TOKEN_MORPHEUS;
  const chatId = process.env.TRINITY_ADMIN_CHAT_ID;
  if (!token || !chatId) return;
  await axios.post(
    `https://api.telegram.org/bot${token}/sendMessage`,
    { chat_id: chatId, text, parse_mode: 'Markdown' },
    { timeout: 8000 }
  ).catch(() => {});
};

const handleAccountUpdated = async (event) => {
  const acct = isSnapshot(event.data?.object) ? event.data.object : event.data;
  const id   = acct?.id || '—';

  // Extract verification status
  const req  = acct?.requirements || {};
  const caps = acct?.capabilities  || {};

  const due       = req.currently_due?.length    || 0;
  const errors    = req.errors?.length           || 0;
  const deadlines = req.pending_verification?.length || 0;

  const cardPayments = caps.card_payments || 'inactive';
  const transfers    = caps.transfers     || 'inactive';

  let status = '⏳ Pending';
  let note   = '';

  if (acct?.charges_enabled && acct?.payouts_enabled) {
    status = '✅ FULLY VERIFIED — charges + payouts enabled';
    note   = '\n\n🎉 *Stripe is now live. Director ID verification complete.*';
  } else if (errors > 0) {
    status = `❌ Verification error (${errors} issue${errors > 1 ? 's' : ''})`;
    note   = `\n\nErrors: ${req.errors?.map(e => e.reason || e.code).join(', ') || '—'}`;
  } else if (due > 0) {
    status = `📋 ${due} item${due > 1 ? 's' : ''} still required`;
    note   = `\nRequired: ${req.currently_due?.slice(0,3).join(', ')}${due > 3 ? ` (+${due-3} more)` : ''}`;
  } else if (deadlines > 0) {
    status = `🔍 Under review (${deadlines} pending)`;
  }

  await tgAlert([
    `🏦 *STRIPE ACCOUNT UPDATE*`,
    ``,
    `Account: \`${id}\``,
    `Status: ${status}`,
    `Card payments: \`${cardPayments}\``,
    `Transfers: \`${transfers}\``,
    `Charges enabled: ${acct?.charges_enabled ? '✅' : '❌'}`,
    `Payouts enabled: ${acct?.payouts_enabled ? '✅' : '❌'}`,
    note,
  ].filter(l => l !== null).join('\n'));
};

const handleCapabilityUpdated = async (event) => {
  const cap  = isSnapshot(event.data?.object) ? event.data.object : event.data;
  const name = cap?.id || cap?.capability || '—';
  const acct = cap?.account || '—';
  const st   = cap?.status  || '—';
  const emoji = st === 'active' ? '✅' : st === 'inactive' ? '❌' : '⏳';

  await tgAlert([
    `${emoji} *STRIPE CAPABILITY UPDATE*`,
    ``,
    `Capability: \`${name}\``,
    `Account: \`${acct}\``,
    `Status: \`${st}\``,
    st === 'active' ? `\n_This capability is now live._` : null,
  ].filter(Boolean).join('\n'));
};

const handleAccountAuthorized = async (event) => {
  const acct = isSnapshot(event.data?.object) ? event.data.object : event.data;
  await tgAlert([
    `🎉 *STRIPE CONNECT AUTHORISED*`,
    ``,
    `Account: \`${acct?.id || '—'}\``,
    ``,
    `_The Connect account has been authorised. Payments are now live._`,
    ``,
    `Next: add the live \`STRIPE_WEBHOOK_SECRET\` to Vercel env vars.`,
  ].join('\n'));
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

  // ── CONNECT ACCOUNT EVENTS ───────────────────────────────────────────────────
  // Fired when director ID verification status changes, capabilities update, etc.
  if (event.type === 'account.updated') {
    await handleAccountUpdated(event);
    return res.status(200).json({ received: true, type: event.type });
  }
  if (event.type === 'capability.updated') {
    await handleCapabilityUpdated(event);
    return res.status(200).json({ received: true, type: event.type });
  }
  if (event.type === 'account.application.authorized') {
    await handleAccountAuthorized(event);
    return res.status(200).json({ received: true, type: event.type });
  }

  // ── PAYMENT EVENTS ────────────────────────────────────────────────────────────
  const PAYMENT_TYPES = [
    'payment_intent.succeeded',
    'checkout.session.completed',
    'charge.succeeded',
  ];

  if (!PAYMENT_TYPES.includes(event.type)) {
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
