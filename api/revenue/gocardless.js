const axios  = require('axios');
const crypto = require('crypto');

// GoCardless UK Direct Debit / Open Banking
// Docs: https://developer.gocardless.com/api-reference/
//
// Required env vars:
//   GOCARDLESS_ACCESS_TOKEN  — from GoCardless dashboard → Developers → Access tokens
//   GOCARDLESS_WEBHOOK_SECRET — from GoCardless dashboard → Developers → Webhooks
//   GOCARDLESS_ENV           — "sandbox" or "live" (defaults to "live")

const BASE_URL = process.env.GOCARDLESS_ENV === 'sandbox'
  ? 'https://api-sandbox.gocardless.com'
  : 'https://api.gocardless.com';

const gc = () => axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization':      `Bearer ${process.env.GOCARDLESS_ACCESS_TOKEN}`,
    'GoCardless-Version': '2015-07-06',
    'Content-Type':       'application/json',
    'Accept':             'application/json',
  },
  timeout: 15000,
});

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────

const createCustomer = async ({ name, email, phone, address_line1, city, postcode, country_code = 'GB' }) => {
  const [given_name, ...rest] = name.trim().split(' ');
  const family_name = rest.join(' ') || given_name;

  const res = await gc().post('/customers', {
    customers: {
      given_name, family_name, email,
      phone_number:  phone        || undefined,
      address_line1: address_line1 || undefined,
      city:          city          || undefined,
      postal_code:   postcode      || undefined,
      country_code,
    },
  });
  return res.data.customers;
};

const getCustomer = async (customerId) => {
  const res = await gc().get(`/customers/${customerId}`);
  return res.data.customers;
};

// ─── REDIRECT FLOWS (mandate collection) ─────────────────────────────────────

// Creates a hosted payment page for the customer to set up a Direct Debit mandate.
// Returns { id, redirect_url } — send redirect_url to customer.
const createRedirectFlow = async ({ description, sessionToken, successUrl, customerId }) => {
  const body = {
    redirect_flows: {
      description,
      session_token:       sessionToken,
      success_redirect_url: successUrl,
    },
  };
  if (customerId) body.redirect_flows.links = { customer: customerId };

  const res = await gc().post('/redirect_flows', body);
  return res.data.redirect_flows;
};

// Call after customer completes the redirect flow (GoCardless sends them to successUrl?redirect_flow_id=...)
const completeRedirectFlow = async (flowId, sessionToken) => {
  const res = await gc().post(`/redirect_flows/${flowId}/actions/complete`, {
    data: { session_token: sessionToken },
  });
  return res.data.redirect_flows; // .links.mandate contains mandate_id
};

// ─── MANDATES ─────────────────────────────────────────────────────────────────

const getMandate = async (mandateId) => {
  const res = await gc().get(`/mandates/${mandateId}`);
  return res.data.mandates;
};

const cancelMandate = async (mandateId) => {
  const res = await gc().post(`/mandates/${mandateId}/actions/cancel`, {});
  return res.data.mandates;
};

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

// amount in pence (GBP). reference should be your IRISE-XXXXXXXX ref.
const createPayment = async ({ mandateId, amount, currency = 'GBP', description, reference, metadata = {} }) => {
  const res = await gc().post('/payments', {
    payments: {
      amount,
      currency,
      description,
      reference,
      metadata,
      links: { mandate: mandateId },
    },
  });
  return res.data.payments;
};

const getPayment = async (paymentId) => {
  const res = await gc().get(`/payments/${paymentId}`);
  return res.data.payments;
};

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

const createSubscription = async ({ mandateId, amount, currency = 'GBP', name, intervalUnit = 'monthly', count, startDate, metadata = {} }) => {
  const body = {
    subscriptions: {
      amount, currency, name,
      interval_unit: intervalUnit,
      metadata,
      links: { mandate: mandateId },
    },
  };
  if (count)     body.subscriptions.count      = count;
  if (startDate) body.subscriptions.start_date = startDate;

  const res = await gc().post('/subscriptions', body);
  return res.data.subscriptions;
};

// ─── WEBHOOK VERIFICATION ─────────────────────────────────────────────────────

// Verifies the Webhook-Signature header (HMAC-SHA256 of raw body)
const verifySignature = (rawBody, signatureHeader) => {
  const secret = process.env.GOCARDLESS_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
};

// ─── EVENT NORMALISATION ──────────────────────────────────────────────────────

// Maps a GoCardless payment event to the standard tx object for decisionEngine.
const normalisePaymentEvent = (event) => {
  const pmt = event.links?.payment;  // payment_id
  const res = event.details?.description || '';
  const ref = event.details?.reference   || pmt || `gc_${event.id}`;

  return {
    id:          `gc_${event.id}`,
    provider:    'gocardless',
    amount:      null,   // filled in after getPayment()
    currency:    'GBP',
    reference:   ref.toUpperCase(),
    sender_name: '',
    sender_ref:  pmt || '',
    raw:         event,
    _payment_id: pmt,    // resolver uses this to fetch actual amount
  };
};

module.exports = {
  createCustomer,
  getCustomer,
  createRedirectFlow,
  completeRedirectFlow,
  getMandate,
  cancelMandate,
  createPayment,
  getPayment,
  createSubscription,
  verifySignature,
  normalisePaymentEvent,
};
