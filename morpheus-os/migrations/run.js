'use strict';

require('dotenv').config();

const { Pool } = require('pg');
const fs   = require('fs');
const path = require('path');

const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'morpheus',
  user:     process.env.PG_USER     || 'morpheus',
  password: process.env.PG_PASSWORD || ''
});

const MIGRATIONS_DIR = __dirname;

// All migration files in order
const MIGRATIONS = [
  '001_initial.sql',
  '002_memory_kpi.sql',
  '003_seed.sql'
];

async function run() {
  const client = await pool.connect();

  try {
    // Create migrations tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id          SERIAL PRIMARY KEY,
        filename    VARCHAR(256) UNIQUE NOT NULL,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const filename of MIGRATIONS) {
      const filepath = path.join(MIGRATIONS_DIR, filename);

      if (!fs.existsSync(filepath)) {
        console.log(`[MIGRATE] Skipping ${filename} — file not found`);
        continue;
      }

      // Check if already applied
      const { rows } = await client.query(
        'SELECT id FROM _migrations WHERE filename = $1',
        [filename]
      );
      if (rows.length > 0) {
        console.log(`[MIGRATE] Already applied: ${filename}`);
        continue;
      }

      console.log(`[MIGRATE] Applying: ${filename}`);
      const sql = fs.readFileSync(filepath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [filename]
        );
        await client.query('COMMIT');
        console.log(`[MIGRATE] ✓ Applied: ${filename}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[MIGRATE] ✗ Failed: ${filename}`, err.message);
        process.exit(1);
      }
    }

    console.log('[MIGRATE] All migrations complete');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[MIGRATE] Fatal:', err.message);
  process.exit(1);
});
