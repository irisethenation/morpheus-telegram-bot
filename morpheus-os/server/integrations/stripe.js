'use strict';

const Stripe  = require('stripe');
const env     = require('../config/env');
const revenue = require('../models/revenue');
const leadModel = require('../models/lead');
const eventBus  = require('../services/eventBus');
const { CHANNELS } = require('../services/eventBus');

let stripe;
function getStripe() {
  if (!stripe) stripe = new Stripe(env.stripe.secretKey, { apiVersion: '2024-06-20' });
  return stripe;
}

async function createPaymentLink({ leadId, productKey, productName, amountGbp, metadata = {} }) {
  const s = getStripe();

  const session = await s.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'gbp',
        unit_amount: Math.round(amountGbp * 100),
        product_data: { name: productName }
      },
      quantity: 1
    }],
    mode: 'payment',
    metadata: { leadId: String(leadId), productKey, ...metadata },
    success_url: `${env.origins.wepayCash}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${env.origins.wepayCash}/payment-cancelled`
  });

  // Record pending payment
  await revenue.record({ leadId, productKey, productName, amountGbp, paymentMethod: 'stripe' });

  console.log(`[STRIPE] Payment link created for lead ${leadId}: ${session.url}`);
  return { url: session.url, sessionId: session.id };
}

async function createInvoice({ leadId, customerEmail, customerName, lineItems }) {
  const s = getStripe();

  // Find or create customer
  const customers = await s.customers.list({ email: customerEmail, limit: 1 });
  let customer = customers.data[0];
  if (!customer) {
    customer = await s.customers.create({ email: customerEmail, name: customerName });
  }

  const invoice = await s.invoices.create({ customer: customer.id, auto_advance: true });

  for (const item of lineItems) {
    await s.invoiceItems.create({
      customer: customer.id,
      invoice: invoice.id,
      currency: 'gbp',
      unit_amount: Math.round(item.amountGbp * 100),
      description: item.description
    });
  }

  const finalised = await s.invoices.finalizeInvoice(invoice.id);
  console.log(`[STRIPE] Invoice created for lead ${leadId}: ${finalised.id}`);
  return { invoiceId: finalised.id, invoiceUrl: finalised.hosted_invoice_url };
}

/**
 * Handle Stripe webhook events — call from the webhook route.
 * Confirms revenue and publishes payment events to the bus.
 */
async function handleWebhook(rawBody, signature) {
  const s = getStripe();
  let event;

  try {
    event = s.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
  } catch {
    throw new Error('Stripe webhook signature invalid');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { leadId, productKey } = session.metadata;

    if (leadId) {
      await revenue.confirm(parseInt(leadId), session.payment_intent);
      await leadModel.updateStatus(parseInt(leadId), 'paid');
      await eventBus.publish(CHANNELS.PAYMENT_EVENT, {
        type:       'payment_confirmed',
        leadId,
        productKey,
        sessionId:  session.id,
        amountGbp:  session.amount_total / 100
      });
    }
  }

  if (event.type === 'invoice.paid') {
    const inv = event.data.object;
    await eventBus.publish(CHANNELS.PAYMENT_EVENT, {
      type:      'invoice_paid',
      invoiceId: inv.id,
      amountGbp: inv.amount_paid / 100,
      customer:  inv.customer_email
    });
  }

  return { received: true };
}

async function syncRevenue() {
  const s = getStripe();
  const sessions = await s.checkout.sessions.list({ limit: 100, status: 'complete' });
  console.log(`[STRIPE SYNC] ${sessions.data.length} completed sessions found`);
  return sessions.data;
}

module.exports = { createPaymentLink, createInvoice, handleWebhook, syncRevenue };
