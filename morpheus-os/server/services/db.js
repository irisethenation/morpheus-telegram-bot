'use strict';

const { Pool } = require('pg');
const env = require('../config/env');

const pool = new Pool({
  host:     env.pg.host,
  port:     env.pg.port,
  database: env.pg.database,
  user:     env.pg.user,
  password: env.pg.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function connect() {
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
  console.log('[DB] PostgreSQL connected');
}

module.exports = { pool, query, transaction, connect };
