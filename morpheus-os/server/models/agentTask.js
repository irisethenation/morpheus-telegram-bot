'use strict';

const { query } = require('../services/db');

async function create({ taskUuid, agentName, taskType, dispatchedBy, leadId = null, chatId, userId, payload = {} }) {
  const result = await query(
    `INSERT INTO agent_tasks
       (task_uuid, agent_name, task_type, dispatched_by, lead_id, chat_id, user_id, payload, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'queued') RETURNING *`,
    [taskUuid, agentName, taskType, dispatchedBy, leadId, chatId, userId, JSON.stringify(payload)]
  );
  return result.rows[0];
}

async function setInProgress(taskUuid) {
  await query(
    `UPDATE agent_tasks SET status = 'in_progress', started_at = NOW() WHERE task_uuid = $1`,
    [taskUuid]
  );
}

async function complete(taskUuid, result = {}) {
  await query(
    `UPDATE agent_tasks
     SET status = 'completed', result = $1, completed_at = NOW(), updated_at = NOW()
     WHERE task_uuid = $2`,
    [JSON.stringify(result), taskUuid]
  );
}

async function fail(taskUuid, errorMessage) {
  await query(
    `UPDATE agent_tasks
     SET status = 'failed', error = $1, completed_at = NOW(), updated_at = NOW()
     WHERE task_uuid = $2`,
    [errorMessage, taskUuid]
  );
}

async function findByUuid(taskUuid) {
  const result = await query('SELECT * FROM agent_tasks WHERE task_uuid = $1', [taskUuid]);
  return result.rows[0] || null;
}

async function listByLead(leadId, { limit = 50 } = {}) {
  const result = await query(
    'SELECT * FROM agent_tasks WHERE lead_id = $1 ORDER BY created_at DESC LIMIT $2',
    [leadId, limit]
  );
  return result.rows;
}

module.exports = { create, setInProgress, complete, fail, findByUuid, listByLead };
