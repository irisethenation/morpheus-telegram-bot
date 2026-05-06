'use strict';

/**
 * CRM Integration
 *
 * Primary CRM = internal PostgreSQL (leads + pipeline tables).
 * External sync = configurable via CRM_WEBHOOK_URL (HubSpot, Pipedrive, etc.)
 * All CRM writes go through this module so the external sync layer
 * can be swapped without touching agent/engine code.
 */

const axios     = require('axios');
const env       = require('../config/env');
const leadModel = require('../models/lead');
const pipeline  = require('../pipeline/stageManager');
const brevo     = require('./brevo');
const { query } = require('../services/db');

// ─── Contact Management ───────────────────────────────────────────────
async function upsertContact({ telegramUserId, firstName, lastName, email, phone, source = 'telegram', chatId, metadata = {} }) {
  // 1. Internal lead record
  const lead = await leadModel.create({
    telegramUserId,
    firstName,
    lastName,
    chatId,
    source,
    metadata: { ...metadata, email, phone }
  });

  // 2. Brevo contact sync
  if (email && env.brevo.apiKey) {
    await brevo.upsertContact({
      email,
      firstName,
      lastName,
      phone,
      listIds:    env.brevo.lists?.allContacts ? [env.brevo.lists.allContacts] : [],
      attributes: { TELEGRAM_ID: String(telegramUserId), SOURCE: source }
    }).catch((e) => console.warn('[CRM] Brevo contact sync failed:', e.message));
  }

  // 3. External CRM sync
  await _syncExternal('contact.upserted', { lead, email, phone });

  return lead;
}

// ─── Deal / Pipeline Management ───────────────────────────────────────
async function createDeal({ leadId, engine, value = 0, metadata = {} }) {
  const entry = await pipeline.create({ leadId, engine, metadata: { ...metadata, deal_value: value } });
  await _syncExternal('deal.created', { leadId, engine, entry, value });
  return entry;
}

async function advanceDeal(pipelineId, stage, extra = {}) {
  const entry = await pipeline.advance(pipelineId, stage, extra);
  await _syncExternal('deal.stage_changed', { pipelineId, stage, entry });
  return entry;
}

async function closeDeal(pipelineId, dealValueGbp, notes = '') {
  const entry = await pipeline.advance(pipelineId, 'closed', { deal_value_gbp: dealValueGbp, closed_at: new Date(), notes });
  await _syncExternal('deal.closed', { pipelineId, dealValueGbp, entry });
  return entry;
}

// ─── Activity Logging ─────────────────────────────────────────────────
async function logActivity({ leadId, type, agentName, description, metadata = {} }) {
  await query(
    `INSERT INTO agent_events (type, agent_name, lead_id, payload, status)
     VALUES ($1, $2, $3, $4, 'ok')`,
    [type, agentName, leadId, JSON.stringify({ description, ...metadata })]
  );
  await _syncExternal('activity.logged', { leadId, type, agentName, description });
}

// ─── Tag management ───────────────────────────────────────────────────
async function addTag(telegramUserId, tag) {
  await query(
    `UPDATE leads
     SET metadata = jsonb_set(
       metadata,
       '{tags}',
       COALESCE(metadata->'tags', '[]'::jsonb) || to_jsonb($1::text)
     ), updated_at = NOW()
     WHERE telegram_user_id = $2`,
    [tag, telegramUserId]
  );
}

async function getByTag(tag) {
  const result = await query(
    `SELECT * FROM leads WHERE metadata->'tags' ? $1 ORDER BY created_at DESC`,
    [tag]
  );
  return result.rows;
}

// ─── Pipeline health view ─────────────────────────────────────────────
async function getPipelineHealth(engine = null) {
  const params = engine ? [engine] : [];
  const where  = engine ? 'WHERE pe.engine = $1' : '';

  const result = await query(
    `SELECT
       pe.engine,
       pe.stage,
       COUNT(pe.id)                    AS count,
       COALESCE(SUM(pe.deal_value_gbp), 0) AS total_value_gbp,
       AVG(EXTRACT(EPOCH FROM (NOW() - pe.created_at)) / 86400) AS avg_age_days
     FROM pipeline_entries pe ${where}
     GROUP BY pe.engine, pe.stage
     ORDER BY pe.engine, pe.stage`,
    params
  );

  return result.rows;
}

async function getRevenueByEngine() {
  const result = await query(
    `SELECT engine,
       COUNT(*) FILTER (WHERE stage IN ('invoiced','upsold')) AS closed_deals,
       COALESCE(SUM(deal_value_gbp) FILTER (WHERE stage IN ('invoiced','upsold')), 0) AS revenue_gbp
     FROM pipeline_entries
     GROUP BY engine ORDER BY revenue_gbp DESC`
  );
  return result.rows;
}

// ─── External CRM sync ────────────────────────────────────────────────
async function _syncExternal(eventType, payload) {
  if (!env.crm?.webhookUrl) return;

  try {
    await axios.post(env.crm.webhookUrl, {
      event:     eventType,
      source:    'morpheus-os',
      timestamp: new Date().toISOString(),
      payload
    }, {
      headers: { 'x-morpheus-secret': env.crm.webhookSecret || '' },
      timeout: 5000
    });
  } catch (e) {
    console.warn(`[CRM] External sync failed for ${eventType}:`, e.message);
  }
}

module.exports = {
  upsertContact, createDeal, advanceDeal, closeDeal,
  logActivity, addTag, getByTag,
  getPipelineHealth, getRevenueByEngine
};
