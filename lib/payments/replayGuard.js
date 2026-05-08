const { query } = require('./db');

// Check if a transaction has already been processed (persistent — DB-backed)
const isDuplicate = async (txId) => {
  const res = await query(
    'SELECT 1 FROM transactions WHERE id = $1',
    [String(txId)]
  );
  return res.rows.length > 0;
};

// Persist the raw transaction immediately on receipt
const storeTransaction = async (tx) => {
  await query(
    `INSERT INTO transactions (id, provider, amount, currency, reference, sender_name, sender_ref, raw)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [
      String(tx.id),
      tx.provider || 'tide',
      tx.amount,
      tx.currency || 'GBP',
      tx.reference || null,
      tx.sender_name || null,
      tx.sender_ref  || null,
      JSON.stringify(tx),
    ]
  );
};

// Mark a transaction as processed once matched
const markProcessed = async (txId) => {
  await query(
    `UPDATE transactions SET processed = TRUE WHERE id = $1`,
    [String(txId)]
  );
};

module.exports = { isDuplicate, storeTransaction, markProcessed };
