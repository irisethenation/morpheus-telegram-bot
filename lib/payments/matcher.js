const { query } = require('./db');

// ─── MATCH TRANSACTION TO AN INVOICE ──────────────────────────────────────────
// Returns { invoice, confidence, match_type } or null.
// Confidence: 100 = exact reference hit. 70–99 = weighted fuzzy. <70 = no match.

const matchTransaction = async (tx) => {

  // ── Step 1: DIRECT REFERENCE MATCH (confidence 100) ──────────────────────
  if (tx.reference) {
    const exact = await query(
      `SELECT * FROM invoices WHERE reference = $1 AND status = 'pending'`,
      [tx.reference.trim().toUpperCase()]
    );
    if (exact.rows.length > 0) {
      return { invoice: exact.rows[0], confidence: 100, match_type: 'reference' };
    }

    // Partial reference match — e.g. "IRISE-A83F91C2 invoice for John" contains the code
    const partial = await query(
      `SELECT * FROM invoices
       WHERE status = 'pending' AND $1 ILIKE '%' || reference || '%'`,
      [tx.reference]
    );
    if (partial.rows.length > 0) {
      return { invoice: partial.rows[0], confidence: 95, match_type: 'reference' };
    }
  }

  // ── Step 2: FUZZY MATCH across pending invoices ───────────────────────────
  const pending = await query(`SELECT * FROM invoices WHERE status = 'pending'`);
  if (pending.rows.length === 0) return null;

  let best  = null;
  let score = 0;

  for (const inv of pending.rows) {
    let s = 0;

    // Amount proximity: exact = 40pts, within £10 = 30pts, within £50 = 20pts
    const diff = Math.abs(Number(inv.amount) - Number(tx.amount));
    if (diff === 0)        s += 40;
    else if (diff <= 10)   s += 30;
    else if (diff <= 50)   s += 20;

    // Time proximity: invoice created within last 7 days
    const age = Date.now() - new Date(inv.created_at).getTime();
    if (age < 86400000)       s += 20;  // < 1 day
    else if (age < 604800000) s += 10;  // < 7 days

    // Reference partial: first 6 chars of reference appear in tx data
    const refSnippet = inv.reference.slice(0, 6);
    const txText = `${tx.reference || ''} ${tx.sender_ref || ''} ${tx.sender_name || ''}`.toUpperCase();
    if (txText.includes(refSnippet)) s += 30;

    // Client name match in sender name
    if (inv.client_name && tx.sender_name) {
      const invName = inv.client_name.toLowerCase();
      const txName  = tx.sender_name.toLowerCase();
      if (txName.includes(invName.split(' ')[0])) s += 10;
    }

    if (s > score) { score = s; best = inv; }
  }

  if (score >= 70) {
    return { invoice: best, confidence: score, match_type: 'fuzzy' };
  }

  return null;
};

module.exports = { matchTransaction };
