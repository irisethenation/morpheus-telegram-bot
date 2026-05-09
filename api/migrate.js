const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');

// One-shot migration endpoint — guarded by API key.
// Call once after deployment:
//   curl -X POST https://<vercel-url>/api/migrate -H "X-API-Key: <MORPHEUS_API_KEY>"
// Safe to call multiple times (all statements use IF NOT EXISTS / OR REPLACE).

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  // Auth guard
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.MORPHEUS_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dbUrl = process.env.PAYMENT_DB_URL;
  if (!dbUrl) {
    return res.status(500).json({
      error: 'PAYMENT_DB_URL not set',
      fix: 'Add PAYMENT_DB_URL to Vercel dashboard → Settings → Environment Variables',
    });
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: process.env.PAYMENT_DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  try {
    // Read migration SQL (bundled with deployment)
    const sqlPath = path.join(__dirname, '..', 'db', '001_payment_tables.sql');
    const sql     = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    // Verify
    const result = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('invoices','transactions','payment_matches','revenue','affiliates','affiliate_earnings')
      ORDER BY tablename;
    `);

    const tables = result.rows.map(r => r.tablename);

    return res.status(200).json({
      ok:      true,
      message: 'Migration 001_payment_tables completed successfully',
      tables,
    });
  } catch (err) {
    console.error('[MIGRATE ERROR]', err.message);
    return res.status(500).json({ error: err.message, detail: err.detail || null });
  } finally {
    client.release();
    await pool.end();
  }
};
