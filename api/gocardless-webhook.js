const { verifySignature, normalisePaymentEvent, getPayment } = require('./revenue/gocardless');
const { processTransaction } = require('./payments/decisionEngine');
const { emitEvent }          = require('./payments/eventBus');
const axios                  = require('axios');

// GoCardless sends a JSON array of events.
// Register this URL in GoCardless dashboard → Developers → Webhooks → Create webhook
// Secret: GOCARDLESS_WEBHOOK_SECRET env var

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // ── SIGNATURE CHECK ────────────────────────────────────────────────────────
  const sig     = req.headers['webhook-signature'] || '';
  const rawBody = req.rawBody || JSON.stringify(req.body);

  if (process.env.GOCARDLESS_WEBHOOK_SECRET && !verifySignature(rawBody, sig)) {
    console.warn('[GC WEBHOOK] Bad signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const events = req.body?.events;
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(200).json({ ok: true, skipped: 'no events' });
  }

  const results = [];

  for (const event of events) {
    const { resource_type, action, id: eventId } = event;
    console.log(`[GC EVENT] ${resource_type}.${action} — ${eventId}`);

    try {
      if (resource_type === 'payments') {
        const result = await handlePaymentEvent(event);
        results.push({ event: eventId, ...result });

      } else if (resource_type === 'mandates') {
        const result = await handleMandateEvent(event);
        results.push({ event: eventId, ...result });

      } else if (resource_type === 'subscriptions') {
        const result = await handleSubscriptionEvent(event);
        results.push({ event: eventId, ...result });

      } else {
        results.push({ event: eventId, skipped: `unhandled resource_type: ${resource_type}` });
      }
    } catch (err) {
      console.error(`[GC EVENT ERROR] ${eventId}`, err.message);
      results.push({ event: eventId, error: err.message });
    }
  }

  return res.status(200).json({ ok: true, processed: results.length, results });
};

// ─── PAYMENT EVENTS ───────────────────────────────────────────────────────────

const handlePaymentEvent = async (event) => {
  const { action } = event;
  const paymentId  = event.links?.payment;

  // Only process money-confirming events
  const CONFIRMED_ACTIONS = ['paid_out', 'confirmed'];
  const FAILED_ACTIONS    = ['failed', 'cancelled', 'charged_back'];

  if (FAILED_ACTIONS.includes(action)) {
    await sendAlert(`⚠️ *GoCardless Payment ${action.toUpperCase()}*\n\nPayment ID: \`${paymentId}\`\nEvent: ${event.id}`);
    return { status: 'alerted', action };
  }

  if (!CONFIRMED_ACTIONS.includes(action)) {
    return { status: 'skipped', action };
  }

  // Fetch full payment to get amount + reference
  let payment;
  try {
    payment = await getPayment(paymentId);
  } catch (err) {
    console.error('[GC] Could not fetch payment:', err.message);
    return { status: 'error', reason: 'payment_fetch_failed' };
  }

  const tx = normalisePaymentEvent(event);
  tx.amount      = payment.amount;          // pence
  tx.currency    = payment.currency || 'GBP';
  tx.reference   = (payment.reference || payment.description || paymentId).toUpperCase();
  tx.sender_name = payment.links?.customer || '';

  const decisionResult = await processTransaction(tx);
  return { status: decisionResult.status, payment_id: paymentId };
};

// ─── MANDATE EVENTS ───────────────────────────────────────────────────────────

const handleMandateEvent = async (event) => {
  const { action } = event;
  const mandateId  = event.links?.mandate;

  const NOTIFY_ACTIONS = { created: '✅', active: '🟢', cancelled: '❌', expired: '⏰', failed: '🔴' };

  if (NOTIFY_ACTIONS[action]) {
    await sendAlert(
      `${NOTIFY_ACTIONS[action]} *GoCardless Mandate ${action.toUpperCase()}*\n\nMandate: \`${mandateId}\`\n\n_Direct Debit ${action}._`
    );
  }

  return { status: 'alerted', action };
};

// ─── SUBSCRIPTION EVENTS ──────────────────────────────────────────────────────

const handleSubscriptionEvent = async (event) => {
  const { action } = event;
  const subId      = event.links?.subscription;

  const emoji = action === 'created' ? '🔄' : action === 'finished' ? '🏁' : action === 'cancelled' ? '❌' : 'ℹ️';
  await sendAlert(`${emoji} *GoCardless Subscription ${action.toUpperCase()}*\n\nSubscription: \`${subId}\``);

  return { status: 'alerted', action };
};

// ─── ALERT ────────────────────────────────────────────────────────────────────

const sendAlert = async (text) => {
  const adminId = process.env.TRINITY_ADMIN_CHAT_ID;
  const token   = process.env.TELEGRAM_BOT_TOKEN_MORPHEUS;
  if (!adminId || !token) return;

  await axios.post(
    `https://api.telegram.org/bot${token}/sendMessage`,
    { chat_id: adminId, text, parse_mode: 'Markdown' },
    { timeout: 8000 }
  ).catch(err => console.error('[GC ALERT]', err.message));
};
