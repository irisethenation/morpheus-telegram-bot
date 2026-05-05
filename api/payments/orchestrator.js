const axios = require('axios');

const MORPHEUS_URL = process.env.MORPHEUS_API_URL || 'http://51.79.29.15:19000';
const MORPHEUS_KEY = process.env.MORPHEUS_API_KEY;
const ovhHeaders   = () => ({ 'X-API-Key': MORPHEUS_KEY, 'Content-Type': 'application/json' });

// Trigger the agent pipeline after a confirmed payment.
// Morpheus receives the event and routes to Trinity / sub-agents.
const runOrchestrator = async ({ id: lead_id, invoice, transaction }) => {
  const msg = [
    `PAYMENT_CONFIRMED:`,
    `lead_id=${lead_id || 'unknown'}`,
    `invoice_id=${invoice?.id}`,
    `invoice_ref=${invoice?.reference}`,
    `amount=${invoice?.amount} ${invoice?.currency}`,
    `client=${invoice?.client_name || 'unknown'}`,
    `email=${invoice?.client_email || 'unknown'}`,
    `tx_id=${transaction?.id}`,
    `confidence=${transaction?.confidence}`,
    `ACTION: trigger_fulfilment_pipeline`,
  ].join(' ');

  try {
    // 1. Notify Morpheus core to begin fulfilment
    await axios.post(
      `${MORPHEUS_URL}/api/morpheus/message`,
      { message: msg, session_id: `payment_confirmed_${invoice?.id}` },
      { headers: ovhHeaders(), timeout: 20000 }
    );

    // 2. Attempt to run trinity_fulfilment skill if available
    await axios.post(
      `${MORPHEUS_URL}/skills/run`,
      {
        name: 'trinity_fulfilment',
        payload: {
          trigger: 'payment_confirmed',
          lead_id,
          invoice_id: invoice?.id,
          client_name: invoice?.client_name,
          client_email: invoice?.client_email,
          amount: invoice?.amount,
          currency: invoice?.currency,
        }
      },
      { headers: ovhHeaders(), timeout: 15000 }
    );
  } catch (err) {
    // Non-fatal — Morpheus may not have the skill yet; core message still logged
    console.error('[ORCHESTRATOR]', err.message);
  }
};

module.exports = { runOrchestrator };
