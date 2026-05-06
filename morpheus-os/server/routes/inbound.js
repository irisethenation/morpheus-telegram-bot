'use strict';

/**
 * Inbound Webhook Route — /api/inbound
 *
 * Receives callbacks from:
 *   POST /api/inbound/twilio/sms      — SMS replies from leads
 *   POST /api/inbound/twilio/voice    — Call status callbacks
 *   POST /api/inbound/vapi            — VAPI call results
 *   POST /api/inbound/stripe          — Stripe payment events
 */

const pipeline   = require('../pipeline/stageManager');
const assets     = require('../memory/winningAssets');
const crm        = require('../integrations/crm');
const brevo      = require('../integrations/brevo');
const stripeInt  = require('../integrations/stripe');
const eventBus   = require('../services/eventBus');
const { CHANNELS } = require('../services/eventBus');
const orchestrator = require('../agents/orchestrator');
const leadModel  = require('../models/lead');
const { query }  = require('../services/db');
const { v4: uuidv4 } = require('uuid');

async function inboundRoutes(fastify) {

  // ─── TWILIO: Inbound SMS reply ──────────────────────────────────────
  // Twilio sends a POST with form-encoded body when a lead replies to an SMS
  fastify.post('/twilio/sms', {
    config: { rawBody: true }
  }, async (req, reply) => {
    const { From, Body, SmsMessageSid } = req.body || {};

    if (!From || !Body) {
      return reply.code(200).type('text/xml').send('<Response/>');
    }

    console.log(`[TWILIO INBOUND SMS] From: ${From} | Body: ${Body}`);

    // Find pipeline entry by phone number stored in lead metadata
    const result = await query(
      `SELECT pe.*, l.id AS lead_db_id, l.telegram_user_id, l.first_name, l.metadata AS lead_metadata
       FROM pipeline_entries pe
       JOIN leads l ON l.id = pe.lead_id
       WHERE l.metadata->>'phone' = $1
       AND pe.stage NOT IN ('closed','invoiced','upsold','dead')
       ORDER BY pe.updated_at DESC LIMIT 1`,
      [From]
    );

    if (result.rows.length > 0) {
      const entry = result.rows[0];

      // Advance pipeline to 'replied'
      await pipeline.markReplied(entry.id);

      // Log outreach outcome
      await query(
        `UPDATE outreach_events SET outcome = 'replied', status = 'replied'
         WHERE pipeline_id = $1 AND external_id = $2`,
        [entry.id, SmsMessageSid]
      );

      // Record asset win if script was used
      const lastOutreach = await query(
        `SELECT script_asset_id FROM outreach_events
         WHERE pipeline_id = $1 AND script_asset_id IS NOT NULL
         ORDER BY created_at DESC LIMIT 1`,
        [entry.id]
      );
      if (lastOutreach.rows[0]?.script_asset_id) {
        await assets.recordOutcome(lastOutreach.rows[0].script_asset_id, true);
      }

      // CRM log
      await crm.logActivity({
        leadId:    entry.lead_db_id,
        type:      'sms_reply',
        agentName: 'sentinel',
        description: `Lead replied via SMS: "${Body.slice(0, 200)}"`,
        metadata: { from: From, body: Body }
      });

      // Check for booking keywords and auto-advance
      const bookingKeywords = ['yes', 'book', 'call', 'interested', 'available', 'when', 'schedule', 'confirm'];
      const bodyLower = Body.toLowerCase();
      if (bookingKeywords.some((k) => bodyLower.includes(k))) {
        await pipeline.advance(entry.id, 'call_booked', { call_booked_at: new Date() });

        // Dispatch Trinity to handle the booking
        await orchestrator.dispatch({
          task_uuid:     uuidv4(),
          agent:         'trinity',
          task_type:     'intake_response',
          dispatched_by: 'twilio-inbound',
          user_id:       entry.telegram_user_id,
          user_name:     entry.first_name || 'Ambassador',
          chat_id:       0,
          lead_id:       entry.lead_db_id,
          data:          { response: Body, stage: 3 }
        });
      } else {
        // Dispatch Sigma to assess the reply
        await orchestrator.dispatch({
          task_uuid:     uuidv4(),
          agent:         'sigma',
          task_type:     'unclassified_query',
          dispatched_by: 'twilio-inbound',
          user_id:       entry.telegram_user_id,
          user_name:     entry.first_name || 'Ambassador',
          chat_id:       0,
          lead_id:       entry.lead_db_id,
          data:          { text: Body, channel: 'sms' }
        });
      }
    }

    // Twilio expects TwiML response
    return reply.code(200).type('text/xml').send('<Response/>');
  });

  // ─── TWILIO: Voice call status callback ────────────────────────────
  fastify.post('/twilio/voice', async (req, reply) => {
    const { CallSid, CallStatus, To, Duration } = req.body || {};

    console.log(`[TWILIO VOICE] ${To} — ${CallStatus} (${Duration}s)`);

    if (CallStatus === 'completed' && Duration > 30) {
      // Find pipeline entry
      const result = await query(
        `SELECT pe.id, l.id AS lead_id FROM outreach_events oe
         JOIN pipeline_entries pe ON pe.id = oe.pipeline_id
         JOIN leads l ON l.id = pe.lead_id
         WHERE oe.external_id = $1 LIMIT 1`,
        [CallSid]
      );

      if (result.rows[0]) {
        await query(
          `UPDATE outreach_events SET outcome = 'answered', duration_s = $1 WHERE external_id = $2`,
          [parseInt(Duration), CallSid]
        );
        await pipeline.advance(result.rows[0].id, 'call_done', { call_done_at: new Date() });
      }
    }

    return reply.code(200).type('text/xml').send('<Response/>');
  });

  // ─── VAPI: Call result webhook ─────────────────────────────────────
  fastify.post('/vapi', async (req, reply) => {
    const { message } = req.body || {};
    if (!message) return reply.send({ ok: true });

    const { type, call } = message;
    console.log(`[VAPI WEBHOOK] type=${type} callId=${call?.id}`);

    if (type === 'end-of-call-report' && call?.metadata) {
      const { pipelineId, leadId, engine } = call.metadata;
      const summary     = call.summary || '';
      const durationSec = call.endedAt && call.startedAt
        ? Math.round((new Date(call.endedAt) - new Date(call.startedAt)) / 1000)
        : 0;

      // Update outreach event
      await query(
        `UPDATE outreach_events SET outcome = $1, duration_s = $2, status = 'completed'
         WHERE external_id = $3`,
        [call.endedReason || 'completed', durationSec, call.id]
      );

      // Assess call outcome from transcript/summary
      const bookedKeywords = ['book', 'schedule', 'yes', 'interested', 'confirm', 'appointment'];
      const wasBooked = bookedKeywords.some((k) => summary.toLowerCase().includes(k));

      if (pipelineId) {
        const newStage = wasBooked ? 'call_booked' : 'outreach_sent';
        const extra    = wasBooked ? { call_booked_at: new Date() } : {};
        await pipeline.advance(parseInt(pipelineId), newStage, extra);
      }

      // Broadcast to command centre
      await eventBus.publish(CHANNELS.AGENT_RESULT, {
        agent:    'vapi',
        callId:   call.id,
        leadId,
        engine,
        booked:   wasBooked,
        duration: durationSec,
        summary:  summary.slice(0, 500)
      });
    }

    return reply.send({ ok: true });
  });

  // ─── STRIPE: Payment webhook ───────────────────────────────────────
  // Stripe requires raw body for signature verification
  fastify.post('/stripe', {
    config: { rawBody: true }
  }, async (req, reply) => {
    const sig = req.headers['stripe-signature'];
    if (!sig) return reply.code(400).send({ error: 'Missing stripe-signature header' });

    try {
      const result = await stripeInt.handleWebhook(req.rawBody, sig);

      // On payment confirmed — send confirmation email and advance pipeline
      // (stripeInt.handleWebhook publishes to eventBus which handles it)

      return reply.send(result);
    } catch (err) {
      console.error('[STRIPE WEBHOOK]', err.message);
      return reply.code(400).send({ error: err.message });
    }
  });

  // ─── Generic external event (for future integrations) ──────────────
  fastify.post('/event', async (req, reply) => {
    const { source, type, payload } = req.body || {};
    if (!source || !type) return reply.code(400).send({ error: 'source and type required' });

    console.log(`[INBOUND EVENT] source=${source} type=${type}`);

    await eventBus.publish(CHANNELS.SYSTEM_ALERT, {
      type:      `external.${source}.${type}`,
      payload,
      timestamp: new Date().toISOString()
    });

    return reply.send({ ok: true });
  });
}

module.exports = inboundRoutes;
