const { Pool } = require('pg');

// Lazy singleton pool — safe for Vercel serverless (reused across warm instances)
let pool;

const getPool = () => {
  if (!pool) {
    const url = process.env.PAYMENT_DB_URL;
    if (!url) throw new Error('PAYMENT_DB_URL environment variable is not set');
    pool = new Pool({
      connectionString: url,
      ssl: process.env.PAYMENT_DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
      max: 3,              // keep low for serverless
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => {
      console.error('[DB POOL ERROR]', err.message);
      pool = null; // force re-init on next call
    });
  }
  return pool;
};

const query = (text, params) => getPool().query(text, params);

module.exports = { query };
