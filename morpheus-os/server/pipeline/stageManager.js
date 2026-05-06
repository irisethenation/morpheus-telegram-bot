'use strict';

const { query, transaction } = require('../services/db');
const eventBus  = require('../services/eventBus');
const { CHANNELS } = require('../services/eventBus');

// Ordered stage progression
const STAGES = [
  'new', 'outreach_sent', 'replied', 'call_booked',
  'call_done', 'closed', 'invoiced', 'follow_up', 'upsold'
];

async function create({ leadId, engine, metadata = {} }) {
  const result = await query(
    `INSERT INTO pipeline_entries (lead_id, engine, metadata)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [leadId, engine, JSON.stringify(metadata)]
  );
  return result.rows[0] || null;
}

async function advance(pipelineId, newStage, extraFields = {}) {
  const setClauses = ['stage = $2', 'updated_at = NOW()'];
  const params     = [pipelineId, newStage];

  const fieldMap = {
    call_booked_at: 'call_booked_at',
    call_done_at:   'call_done_at',
    closed_at:      'closed_at',
    invoice_id:     'invoice_id',
    deal_value_gbp: 'deal_value_gbp',
    notes:          'notes'
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (extraFields[key] !== undefined) {
      params.push(extraFields[key]);
      setClauses.push(`${col} = $${params.length}`);
    }
  }

  const result = await query(
    `UPDATE pipeline_entries SET ${setClauses.join(', ')}
     WHERE id = $1 RETURNING *`,
    params
  );

  const entry = result.rows[0];
  if (entry) {
    await eventBus.publish(CHANNELS.LEAD_UPDATED, {
      type:       'pipeline_stage_advanced',
      pipelineId,
      leadId:     entry.lead_id,
      engine:     entry.engine,
      stage:      newStage,
      timestamp:  new Date().toISOString()
    });
  }

  return entry || null;
}

async function incrementOutreach(pipelineId) {
  await query(
    `UPDATE pipeline_entries
     SET outreach_count = outreach_count + 1,
         last_outreach_at = NOW(),
         stage = CASE WHEN stage = 'new' THEN 'outreach_sent'::pipeline_stage ELSE stage END,
         updated_at = NOW()
     WHERE id = $1`,
    [pipelineId]
  );
}

async function markReplied(pipelineId) {
  await query(
    `UPDATE pipeline_entries
     SET reply_received = TRUE, stage = 'replied', updated_at = NOW()
     WHERE id = $1`,
    [pipelineId]
  );
}

async function getByLead(leadId) {
  const result = await query(
    `SELECT pe.*, l.first_name, l.last_name, l.telegram_user_id
     FROM pipeline_entries pe
     JOIN leads l ON l.id = pe.lead_id
     WHERE pe.lead_id = $1
     ORDER BY pe.created_at DESC`,
    [leadId]
  );
  return result.rows;
}

async function getByStage(stage, engine = null) {
  const params = [stage];
  let sql = `SELECT pe.*, l.first_name, l.last_name, l.metadata
             FROM pipeline_entries pe
             JOIN leads l ON l.id = pe.lead_id
             WHERE pe.stage = $1`;
  if (engine) { params.push(engine); sql += ` AND pe.engine = $${params.length}`; }
  sql += ' ORDER BY pe.updated_at ASC';

  const result = await query(sql, params);
  return result.rows;
}

async function getStale({ engine, maxHours = 24 }) {
  const params = [maxHours];
  let sql = `SELECT pe.*, l.first_name, l.metadata
             FROM pipeline_entries pe
             JOIN leads l ON l.id = pe.lead_id
             WHERE pe.stage NOT IN ('closed','invoiced','upsold','dead')
             AND pe.updated_at < NOW() - ($1 || ' hours')::INTERVAL`;
  if (engine) { params.push(engine); sql += ` AND pe.engine = $${params.length}`; }
  const result = await query(sql, params);
  return result.rows;
}

async function countByStage(engine = null) {
  const params = engine ? [engine] : [];
  const where  = engine ? 'WHERE engine = $1' : '';
  const result = await query(
    `SELECT stage, COUNT(*) AS count FROM pipeline_entries ${where} GROUP BY stage`,
    params
  );
  return Object.fromEntries(result.rows.map((r) => [r.stage, parseInt(r.count)]));
}

async function kill(pipelineId, reason = '') {
  await query(
    `UPDATE pipeline_entries SET stage = 'dead', notes = $2, updated_at = NOW() WHERE id = $1`,
    [pipelineId, reason]
  );
}

module.exports = {
  create, advance, incrementOutreach, markReplied,
  getByLead, getByStage, getStale, countByStage, kill, STAGES
};
