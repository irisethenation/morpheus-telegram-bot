#!/usr/bin/env node
/**
 * Migration runner — 001_payment_tables.sql
 *
 * Usage (local / OVH):
 *   PAYMENT_DB_URL=postgresql://user:pass@host:5432/morpheus_core node scripts/migrate.js
 *
 * Or via Vercel (one-shot endpoint):
 *   curl -X POST https://<your-vercel-url>/api/migrate \
 *        -H "X-API-Key: <MORPHEUS_API_KEY>"
 */

const { Pool }  = require('pg');
const fs        = require('fs');
const path      = require('path');

const PAYMENT_DB_URL = process.env.PAYMENT_DB_URL;
if (!PAYMENT_DB_URL) {
  console.error('❌ PAYMENT_DB_URL environment variable is required');
  console.error('   export PAYMENT_DB_URL=postgresql://user:pass@host:5432/morpheus_core');
  process.exit(1);
}

const SQL_FILE = path.join(__dirname, '..', 'db', '001_payment_tables.sql');

const run = async () => {
  console.log('🔌 Connecting to PostgreSQL...');
  const pool = new Pool({
    connectionString: PAYMENT_DB_URL,
    ssl: process.env.PAYMENT_DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  try {
    console.log('✅ Connected\n');
    const sql = fs.readFileSync(SQL_FILE, 'utf8');

    console.log('🏗  Running migration: 001_payment_tables.sql');
    await client.query(sql);
    console.log('✅ Migration complete\n');

    // Verify tables
    const res = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('invoices','transactions','payment_matches','revenue','affiliates','affiliate_earnings')
      ORDER BY tablename;
    `);
    console.log('📋 Verified tables:');
    res.rows.forEach(r => console.log(`   ✓ ${r.tablename}`));

    // Show counts
    for (const t of res.rows.map(r => r.tablename)) {
      const c = await client.query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`   ${t}: ${c.rows[0].count} rows`);
    }

    console.log('\n✅ Payment intelligence tables are ready.');
    console.log('   Next step: add PAYMENT_DB_URL to Vercel dashboard env vars.\n');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err.detail || '');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

run();
