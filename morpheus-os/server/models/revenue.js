'use strict';

const { query } = require('../services/db');

async function record({ leadId, productKey, productName, amountGbp, currency = 'GBP', paymentMethod, stripePaymentId = null, status = 'pending' }) {
  const result = await query(
    `INSERT INTO revenue_events
       (lead_id, product_key, product_name, amount_gbp, currency, payment_method, stripe_payment_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [leadId, productKey, productName, amountGbp, currency, paymentMethod, stripePaymentId, status]
  );
  return result.rows[0];
}

async function confirm(id, stripePaymentId) {
  const result = await query(
    `UPDATE revenue_events
     SET status = 'confirmed', stripe_payment_id = $1, confirmed_at = NOW(), updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [stripePaymentId, id]
  );
  return result.rows[0] || null;
}

async function summary() {
  const result = await query(
    `SELECT
       SUM(amount_gbp) FILTER (WHERE status = 'confirmed') AS total_confirmed,
       SUM(amount_gbp) FILTER (WHERE status = 'pending')   AS total_pending,
       COUNT(*)        FILTER (WHERE status = 'confirmed') AS transactions_confirmed,
       COUNT(*)        FILTER (WHERE status = 'pending')   AS transactions_pending
     FROM revenue_events`
  );
  return result.rows[0];
}

async function listByLead(leadId) {
  const result = await query(
    'SELECT * FROM revenue_events WHERE lead_id = $1 ORDER BY created_at DESC',
    [leadId]
  );
  return result.rows;
}

module.exports = { record, confirm, summary, listByLead };
