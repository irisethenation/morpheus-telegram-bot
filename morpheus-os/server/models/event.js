'use strict';

const { query } = require('../services/db');

async function log({ type, agentName, leadId = null, chatId = null, payload = {}, status = 'ok' }) {
  const result = await query(
    `INSERT INTO agent_events (type, agent_name, lead_id, chat_id, payload, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [type, agentName, leadId, chatId, JSON.stringify(payload), status]
  );
  return result.rows[0];
}

async function list({ agentName, leadId, limit = 100, offset = 0 } = {}) {
  const params = [];
  const conditions = [];

  if (agentName) { params.push(agentName); conditions.push(`agent_name = $${params.length}`); }
  if (leadId)    { params.push(leadId);    conditions.push(`lead_id = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const result = await query(
    `SELECT * FROM agent_events ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return result.rows;
}

module.exports = { log, list };
