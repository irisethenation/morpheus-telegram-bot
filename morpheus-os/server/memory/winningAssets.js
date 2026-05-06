'use strict';

const { query } = require('../services/db');

async function create({ type, name, engine = null, context = null, content, metadata = {} }) {
  const result = await query(
    `INSERT INTO winning_assets (type, name, engine, context, content, metadata)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [type, name, engine, context, content, JSON.stringify(metadata)]
  );
  return result.rows[0];
}

async function getBest({ type, engine = null, context = null, limit = 1 }) {
  const params = [type, true];
  const conditions = ['type = $1', 'active = $2'];

  if (engine)  { params.push(engine);  conditions.push(`(engine = $${params.length} OR engine IS NULL)`); }
  if (context) { params.push(context); conditions.push(`context = $${params.length}`); }

  params.push(limit);
  const result = await query(
    `SELECT * FROM winning_assets
     WHERE ${conditions.join(' AND ')}
     ORDER BY success_rate DESC, uses DESC
     LIMIT $${params.length}`,
    params
  );
  return limit === 1 ? result.rows[0] || null : result.rows;
}

async function recordOutcome(id, won) {
  await query(
    `UPDATE winning_assets
     SET uses = uses + 1,
         wins = wins + CASE WHEN $1 THEN 1 ELSE 0 END,
         success_rate = (wins + CASE WHEN $1 THEN 1 ELSE 0 END)::numeric / (uses + 1),
         updated_at = NOW()
     WHERE id = $2`,
    [won, id]
  );
}

async function list({ type, engine, active = true, limit = 50 } = {}) {
  const params = [];
  const conditions = [];

  if (active !== null) { params.push(active);  conditions.push(`active = $${params.length}`); }
  if (type)            { params.push(type);    conditions.push(`type = $${params.length}`); }
  if (engine)          { params.push(engine);  conditions.push(`engine = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);

  const result = await query(
    `SELECT * FROM winning_assets ${where}
     ORDER BY success_rate DESC, uses DESC
     LIMIT $${params.length}`,
    params
  );
  return result.rows;
}

async function deactivate(id) {
  await query(`UPDATE winning_assets SET active = FALSE, updated_at = NOW() WHERE id = $1`, [id]);
}

async function getById(id) {
  const result = await query('SELECT * FROM winning_assets WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function summary() {
  const result = await query(
    `SELECT type, engine,
       COUNT(*)           AS total,
       ROUND(AVG(success_rate)::numeric, 4) AS avg_success_rate,
       SUM(uses)          AS total_uses,
       SUM(wins)          AS total_wins
     FROM winning_assets
     WHERE active = TRUE
     GROUP BY type, engine
     ORDER BY avg_success_rate DESC`
  );
  return result.rows;
}

module.exports = { create, getBest, recordOutcome, list, deactivate, getById, summary };
