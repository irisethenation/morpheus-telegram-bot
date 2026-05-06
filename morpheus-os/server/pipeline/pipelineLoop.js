'use strict';

/**
 * Pipeline Loop — processes leads through the full lifecycle.
 * lead → outreach → reply → booking → close → invoice → follow-up → upsell
 *
 * Called by each engine's daily run and on-demand triggers.
 */

const pipeline    = require('./stageManager');
const twilio      = require('../integrations/twilio');
const vapi        = require('../integrations/vapi');
const stripe      = require('../integrations/stripe');
const assets      = require('../memory/winningAssets');
const eventBus    = require('../services/eventBus');
const { CHANNELS } = require('../services/eventBus');
const { query }   = require('../services/db');

/**
 * Run the full pipeline loop for one engine.
 * Returns a summary of actions taken.
 */
async function run(engine, config = {}) {
  const summary = { engine, actions: [], outreachSent: 0, stagesAdvanced: 0, errors: [] };

  try {
    await _processNewLeads(engine, config, summary);
    await _followUpStale(engine, config, summary);
    await _nudgeReplied(engine, config, summary);
    await _checkCallsDone(engine, config, summary);
    await _sendInvoices(engine, config, summary);
    await _runFollowUp(engine, config, summary);
    await _offerUpsell(engine, config, summary);
  } catch (err) {
    summary.errors.push(err.message);
    console.error(`[PIPELINE LOOP:${engine}]`, err.message);
  }

  return summary;
}

// Stage 1 → 2: Send initial outreach to new leads
async function _processNewLeads(engine, config, summary) {
  const newEntries = await pipeline.getByStage('new', engine);
  const script = await assets.getBest({ type: 'sms_template', engine, context: 'cold_outreach' });

  for (const entry of newEntries) {
    try {
      const phone = entry.metadata?.phone;
      if (!phone) continue;

      if (script && phone) {
        const result = await twilio.sendOutreachSMS({
          to: phone,
          leadName: entry.first_name,
          script: script.content
        });
        await _logOutreach(entry.id, entry.lead_id, 'sms', result.sid, script.id);
        await assets.recordOutcome(script.id, false); // outcome updated on reply
      }

      await pipeline.incrementOutreach(entry.id);
      summary.outreachSent++;
      summary.actions.push(`SMS outreach → lead ${entry.lead_id}`);

    } catch (err) {
      summary.errors.push(`Outreach lead ${entry.lead_id}: ${err.message}`);
    }
  }
}

// Stale leads in outreach_sent: try VAPI AI call if SMS had no reply
async function _followUpStale(engine, config, summary) {
  const staleHours = config.staleHours || 48;
  const staleEntries = await pipeline.getStale({ engine, maxHours: staleHours });

  for (const entry of staleEntries.filter((e) => e.stage === 'outreach_sent')) {
    if (entry.outreach_count >= (config.maxOutreach || 3)) {
      await pipeline.kill(entry.id, 'Max outreach attempts reached');
      continue;
    }

    try {
      const phone = entry.metadata?.phone;
      const vapiAssistantId = config.vapiAssistantId || process.env.VAPI_ASSISTANT_ID;

      if (phone && vapiAssistantId) {
        const result = await vapi.call({
          to: phone,
          assistantId: vapiAssistantId,
          assistantOverrides: {
            variableValues: {
              name:   entry.first_name || 'there',
              engine: engine
            }
          },
          metadata: { pipelineId: entry.id, leadId: entry.lead_id, engine }
        });
        await _logOutreach(entry.id, entry.lead_id, 'vapi', result.callId);
        summary.actions.push(`VAPI call → lead ${entry.lead_id} (stale follow-up)`);
      }
      await pipeline.incrementOutreach(entry.id);
    } catch (err) {
      summary.errors.push(`VAPI lead ${entry.lead_id}: ${err.message}`);
    }
  }
}

// Stage 2 → 3 → 4: Replied leads — book call
async function _nudgeReplied(engine, config, summary) {
  const replied = await pipeline.getByStage('replied', engine);
  const bookingScript = await assets.getBest({ type: 'sms_template', engine, context: 'booking_nudge' });

  for (const entry of replied) {
    if (!bookingScript) continue;
    try {
      const phone = entry.metadata?.phone;
      if (!phone) continue;
      await twilio.sendOutreachSMS({ to: phone, leadName: entry.first_name, script: bookingScript.content });
      await _logOutreach(entry.id, entry.lead_id, 'sms', null, bookingScript.id);
      summary.actions.push(`Booking nudge SMS → lead ${entry.lead_id}`);
    } catch (err) {
      summary.errors.push(`Nudge lead ${entry.lead_id}: ${err.message}`);
    }
  }
}

// Stage 4 → 5: Calls that are past their booked time — mark done
async function _checkCallsDone(engine, config, summary) {
  const result = await query(
    `SELECT * FROM pipeline_entries
     WHERE engine = $1 AND stage = 'call_booked'
     AND call_booked_at < NOW() - INTERVAL '1 hour'`,
    [engine]
  );
  for (const entry of result.rows) {
    await pipeline.advance(entry.id, 'call_done', { call_done_at: new Date() });
    summary.stagesAdvanced++;
    summary.actions.push(`Marked call done → pipeline ${entry.id}`);
  }
}

// Stage 5 → 6 → 7: Closed deals — create Stripe invoice
async function _sendInvoices(engine, config, summary) {
  const closed = await pipeline.getByStage('closed', engine);
  for (const entry of closed) {
    if (!entry.deal_value_gbp) continue;
    try {
      const email = entry.metadata?.email;
      if (!email) continue;

      const { invoiceId, invoiceUrl } = await stripe.createInvoice({
        leadId:       entry.lead_id,
        customerEmail: email,
        customerName: `${entry.first_name || ''} ${entry.last_name || ''}`.trim(),
        lineItems: [{ description: `${engine} Service`, amountGbp: entry.deal_value_gbp }]
      });

      await pipeline.advance(entry.id, 'invoiced', { invoice_id: invoiceId });
      summary.stagesAdvanced++;
      summary.actions.push(`Invoice sent → lead ${entry.lead_id}: ${invoiceId}`);

      await eventBus.publish(CHANNELS.PAYMENT_EVENT, {
        type: 'invoice_created', leadId: entry.lead_id, invoiceId, invoiceUrl, engine
      });
    } catch (err) {
      summary.errors.push(`Invoice lead ${entry.lead_id}: ${err.message}`);
    }
  }
}

// Stage 7 → 8: Post-invoice follow-up
async function _runFollowUp(engine, config, summary) {
  const invoiced = await pipeline.getByStage('invoiced', engine);
  const followUpScript = await assets.getBest({ type: 'sms_template', engine, context: 'follow_up' });

  for (const entry of invoiced.filter((e) => !e.follow_up_sent)) {
    try {
      const phone = entry.metadata?.phone;
      if (phone && followUpScript) {
        await twilio.sendOutreachSMS({ to: phone, leadName: entry.first_name, script: followUpScript.content });
        await query(`UPDATE pipeline_entries SET follow_up_sent = TRUE, updated_at = NOW() WHERE id = $1`, [entry.id]);
        await pipeline.advance(entry.id, 'follow_up');
        summary.stagesAdvanced++;
        summary.actions.push(`Follow-up sent → lead ${entry.lead_id}`);
      }
    } catch (err) {
      summary.errors.push(`Follow-up lead ${entry.lead_id}: ${err.message}`);
    }
  }
}

// Stage 8 → 9: Upsell offer to follow-up leads
async function _offerUpsell(engine, config, summary) {
  const followUp = await pipeline.getByStage('follow_up', engine);
  const upsellScript = await assets.getBest({ type: 'sms_template', engine, context: 'upsell' });

  for (const entry of followUp.filter((e) => !e.upsell_offered)) {
    try {
      const phone = entry.metadata?.phone;
      if (phone && upsellScript) {
        await twilio.sendOutreachSMS({ to: phone, leadName: entry.first_name, script: upsellScript.content });
        await query(`UPDATE pipeline_entries SET upsell_offered = TRUE, updated_at = NOW() WHERE id = $1`, [entry.id]);
        summary.actions.push(`Upsell offered → lead ${entry.lead_id}`);
      }
    } catch (err) {
      summary.errors.push(`Upsell lead ${entry.lead_id}: ${err.message}`);
    }
  }
}

async function _logOutreach(pipelineId, leadId, channel, externalId, scriptAssetId = null) {
  await query(
    `INSERT INTO outreach_events (pipeline_id, lead_id, channel, external_id, script_asset_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [pipelineId, leadId, channel, externalId, scriptAssetId]
  );
}

module.exports = { run };
