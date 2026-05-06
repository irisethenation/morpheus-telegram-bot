'use strict';

const { query } = require('../services/db');

async function upsert({ name, engine = null, steps, metadata = {} }) {
  const result = await query(
    `INSERT INTO sop_procedures (name, engine, steps)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE
       SET steps = EXCLUDED.steps,
           version = sop_procedures.version + 1,
           updated_at = NOW()
     RETURNING *`,
    [name, engine, JSON.stringify(steps)]
  );
  return result.rows[0];
}

async function get(name) {
  const result = await query(
    `SELECT * FROM sop_procedures WHERE name = $1 AND active = TRUE`,
    [name]
  );
  return result.rows[0] || null;
}

async function list(engine = null) {
  const result = engine
    ? await query(`SELECT * FROM sop_procedures WHERE (engine = $1 OR engine IS NULL) AND active = TRUE ORDER BY name`, [engine])
    : await query(`SELECT * FROM sop_procedures WHERE active = TRUE ORDER BY name`);
  return result.rows;
}

// Execute an SOP — returns step-by-step action plan for the orchestrator
async function resolve(name, context = {}) {
  const sop = await get(name);
  if (!sop) return null;

  return sop.steps.map((step) => ({
    ...step,
    context,
    resolved_at: new Date().toISOString()
  }));
}

module.exports = { upsert, get, list, resolve };
