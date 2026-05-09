const { isDuplicate, storeTransaction, markProcessed } = require('./replayGuard');
const { matchTransaction }   = require('./matcher');
const { markPaid }           = require('./invoiceService');
const { emitEvent }          = require('./eventBus');
const { runOrchestrator }    = require('./orchestrator');
const { query }              = require('./db');
const { v4: uuid }           = require('uuid');

// ─── PROVIDERS THAT BYPASS INVOICE MATCHING ───────────────────────────────────
// Stars payments are pre-priced product purchases with no IRISE invoice ref.
// GoCardless and all others go through the standard matcher.
const DIRECT_REVENUE_PROVIDERS = new Set(['telegram_stars']);

// ─── MAIN ENTRY POINT ─────────────────────────────────────────────────────────
// Called by every payment webhook (Tide, Stripe, GoCardless, crypto, Stars).
// tx shape: { id, provider, amount, currency, reference, sender_name, sender_ref, raw }

const processTransaction = async (tx) => {

  // ── 1. REPLAY GUARD ────────────────────────────────────────────────────────
  if (await isDuplicate(tx.id)) {
    await emitEvent('payment.duplicate', { id: tx.id });
    return { status: 'duplicate' };
  }

  // ── 2. STORE RAW (idempotent) ──────────────────────────────────────────────
  await storeTransaction(tx);

  // ── 3a. DIRECT REVENUE (Stars — no invoice to match) ──────────────────────
  if (DIRECT_REVENUE_PROVIDERS.has(tx.provider)) {
    return processDirectRevenue(tx);
  }

  // ── 3b. MATCH ─────────────────────────────────────────────────────────────
  const match = await matchTransaction(tx);

  if (!match) {
    await emitEvent('payment.unmatched', tx);
    return { status: 'unmatched' };
  }

  const { invoice, confidence, match_type } = match;

  // ── 4. WRITE MATCH RECORD (anti-replay at invoice level) ──────────────────
  try {
    await query(
      `INSERT INTO payment_matches (id, transaction_id, invoice_id, confidence, match_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuid(), tx.id, invoice.id, confidence, match_type]
    );
  } catch (e) {
    // UNIQUE constraint on transaction_id — already matched (race condition guard)
    if (e.code === '23505') {
      await emitEvent('payment.duplicate', { id: tx.id, reason: 'match_exists' });
      return { status: 'duplicate' };
    }
    throw e;
  }

  // ── 5. MARK INVOICE PAID ──────────────────────────────────────────────────
  await markPaid(invoice.id, tx.id);

  // ── 6. LOCK REVENUE ───────────────────────────────────────────────────────
  await query(
    `INSERT INTO revenue (id, lead_id, invoice_id, transaction_id, total_value, currency)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [uuid(), invoice.lead_id, invoice.id, tx.id, invoice.amount, invoice.currency]
  );

  // ── 7. MARK TX PROCESSED ──────────────────────────────────────────────────
  await markProcessed(tx.id);

  // ── 8. EMIT EVENT ─────────────────────────────────────────────────────────
  await emitEvent('payment.received', {
    amount:     invoice.amount,
    currency:   invoice.currency,
    reference:  invoice.reference,
    invoice_id: invoice.id,
    confidence,
    match_type,
    client_name: invoice.client_name,
  });

  // ── 9. TRIGGER AGENTS ─────────────────────────────────────────────────────
  await runOrchestrator({
    id: invoice.lead_id,
    invoice,
    transaction: { id: tx.id, confidence, match_type },
  });

  return { status: 'matched', invoice_id: invoice.id, confidence };
};

// ─── DIRECT REVENUE (Telegram Stars) ─────────────────────────────────────────
// No invoice matching — record revenue directly from product payload.
const processDirectRevenue = async (tx) => {
  const revenueId = uuid();

  await query(
    `INSERT INTO revenue (id, lead_id, invoice_id, transaction_id, total_value, currency)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [revenueId, null, null, tx.id, tx.amount, tx.currency]
  );

  await markProcessed(tx.id);

  await emitEvent('payment.received', {
    amount:      tx.amount,
    currency:    tx.currency,
    reference:   tx.reference,
    invoice_id:  null,
    confidence:  100,
    match_type:  'direct',
    client_name: tx.sender_name || 'Telegram User',
  });

  return { status: 'direct', provider: tx.provider, revenue_id: revenueId };
};

module.exports = { processTransaction };
