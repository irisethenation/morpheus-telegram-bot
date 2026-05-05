const { createInvoice, getInvoice, listAll, listPending } = require('./payments/invoiceService');
const { emitEvent } = require('./payments/eventBus');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Simple API key guard — internal use only
  const key = req.headers['x-api-key'] || req.query.key;
  if (key !== process.env.MORPHEUS_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── GET /api/invoice?id=... ───────────────────────────────────────────────
  if (req.method === 'GET') {
    const { id, list, pending } = req.query;
    try {
      if (pending) {
        const rows = await listPending();
        return res.json({ ok: true, invoices: rows });
      }
      if (list) {
        const rows = await listAll(Number(list) || 20);
        return res.json({ ok: true, invoices: rows });
      }
      if (id) {
        const inv = await getInvoice(id);
        if (!inv) return res.status(404).json({ error: 'Invoice not found' });
        return res.json({ ok: true, invoice: inv });
      }
      return res.status(400).json({ error: 'Provide id, list, or pending query param' });
    } catch (err) {
      console.error('[INVOICE GET]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/invoice ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { lead_id, amount, currency, description, client_name, client_email } = req.body || {};
    if (!amount) return res.status(400).json({ error: 'amount is required' });

    try {
      const invoice = await createInvoice({ lead_id, amount, currency, description, client_name, client_email });

      // Fire Telegram notification
      await emitEvent('invoice.created', invoice);

      return res.status(201).json({ ok: true, invoice });
    } catch (err) {
      console.error('[INVOICE CREATE]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
