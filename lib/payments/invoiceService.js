const { v4: uuid } = require('uuid');
const { query } = require('./db');

// Generate a human-readable bank transfer reference: IRISE-A83F91C2
const genReference = () => `IRISE-${uuid().slice(0, 8).toUpperCase()}`;

const createInvoice = async ({ lead_id, amount, currency = 'GBP', description, client_name, client_email }) => {
  const id        = uuid();
  const reference = genReference();

  await query(
    `INSERT INTO invoices (id, lead_id, amount, currency, reference, description, client_name, client_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, lead_id || null, amount, currency, reference, description || null, client_name || null, client_email || null]
  );

  return { id, reference, amount, currency, status: 'pending' };
};

const getInvoice = async (id) => {
  const res = await query('SELECT * FROM invoices WHERE id = $1', [id]);
  return res.rows[0] || null;
};

const getInvoiceByReference = async (reference) => {
  const res = await query('SELECT * FROM invoices WHERE reference = $1', [reference]);
  return res.rows[0] || null;
};

const markPaid = async (id, transaction_id) => {
  await query(
    `UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE id = $1`,
    [id]
  );
};

const listPending = async () => {
  const res = await query(
    `SELECT * FROM invoices WHERE status = 'pending' ORDER BY created_at DESC LIMIT 50`
  );
  return res.rows;
};

const listAll = async (limit = 20) => {
  const res = await query(
    `SELECT * FROM invoices ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return res.rows;
};

module.exports = { createInvoice, getInvoice, getInvoiceByReference, markPaid, listPending, listAll, genReference };
