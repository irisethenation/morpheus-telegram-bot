'use strict';

const { query, transaction } = require('../services/db');

async function create({ telegramUserId, firstName, lastName, chatId, source = 'telegram', metadata = {} }) {
  const result = await query(
    `INSERT INTO leads (telegram_user_id, first_name, last_name, chat_id, source, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (telegram_user_id) DO UPDATE
       SET first_name = EXCLUDED.first_name,
           last_name  = EXCLUDED.last_name,
           chat_id    = EXCLUDED.chat_id,
           updated_at = NOW()
     RETURNING *`,
    [telegramUserId, firstName, lastName || null, chatId, source, JSON.stringify(metadata)]
  );
  return result.rows[0];
}

async function findByTelegramId(telegramUserId) {
  const result = await query(
    'SELECT * FROM leads WHERE telegram_user_id = $1',
    [telegramUserId]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await query('SELECT * FROM leads WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function updateStatus(telegramUserId, status) {
  const result = await query(
    `UPDATE leads SET status = $1, updated_at = NOW()
     WHERE telegram_user_id = $2 RETURNING *`,
    [status, telegramUserId]
  );
  return result.rows[0] || null;
}

async function updateIntakeStage(telegramUserId, stage, intakeData = {}) {
  const result = await query(
    `UPDATE leads
     SET intake_stage = $1,
         intake_data  = intake_data || $2::jsonb,
         updated_at   = NOW()
     WHERE telegram_user_id = $3 RETURNING *`,
    [stage, JSON.stringify(intakeData), telegramUserId]
  );
  return result.rows[0] || null;
}

async function list({ limit = 50, offset = 0, status } = {}) {
  const params = [limit, offset];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE status = $${params.length}`;
  }
  const result = await query(
    `SELECT * FROM leads ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    params
  );
  return result.rows;
}

module.exports = { create, findByTelegramId, findById, updateStatus, updateIntakeStage, list };
