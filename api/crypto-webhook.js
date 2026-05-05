const { processTransaction } = require('./payments/decisionEngine');

// Generic crypto payment webhook.
// Designed to receive normalised payloads from:
//   - NOWPayments (nowpayments.io)
//   - CoinGate
//   - Custom on-chain listener (OVH cron polling wallet)
//
// Expected POST body:
//   { txHash, amount, currency, memo, sender_address }

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = req.body;
  const txId = body?.txHash || body?.tx_hash || body?.id;
  if (!txId || body?.amount === undefined) {
    return res.status(400).json({ error: 'Missing txHash or amount' });
  }

  const tx = {
    id:          String(txId),
    provider:    'crypto',
    amount:      Number(body.amount),
    currency:    (body.currency || body.pay_currency || 'BTC').toUpperCase(),
    // memo / payment ID field is where clients put the IRISE-XXXXXXXX reference
    reference:   (body.memo || body.payment_id || body.description || '').toUpperCase().trim(),
    sender_name: body.sender_name || null,
    sender_ref:  body.sender_address || null,
    raw:         body,
  };

  try {
    const result = await processTransaction(tx);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('[CRYPTO WEBHOOK ERROR]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
