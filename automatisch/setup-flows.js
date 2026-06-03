#!/usr/bin/env node
/**
 * Automatisch Flow Setup Script — iRise Nation
 *
 * Creates all 10 micro-task workflow flows via the Automatisch REST API.
 * Run once after deploying Automatisch:
 *
 *   AUTOMATISCH_URL=https://automatisch.irise.academy \
 *   AUTOMATISCH_EMAIL=admin@irise.academy \
 *   AUTOMATISCH_PASSWORD=yourpassword \
 *   node automatisch/setup-flows.js
 *
 * The script prints the webhook URL for each created flow —
 * copy those into your Vercel environment variables.
 */

const https = require('https');
const http  = require('http');
const { URL } = require('url');

const BASE_URL = (process.env.AUTOMATISCH_URL || 'http://localhost:3000').replace(/\/$/, '');
const EMAIL    = process.env.AUTOMATISCH_EMAIL    || 'admin@irise.academy';
const PASSWORD = process.env.AUTOMATISCH_PASSWORD;

if (!PASSWORD) {
  console.error('AUTOMATISCH_PASSWORD is required');
  process.exit(1);
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────────
function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url  = new URL(`${BASE_URL}${path}`);
    const data = body ? JSON.stringify(body) : null;
    const lib  = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data && { 'Content-Length': Buffer.byteLength(data) }),
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    };

    const req = lib.request(options, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch {
          resolve({ status: res.statusCode, body: buf });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ─── Automatisch API wrappers ─────────────────────────────────────────────────
async function login() {
  const res = await request('POST', '/api/v1/login', { email: EMAIL, password: PASSWORD });
  if (res.status !== 200 || !res.body?.data?.token) {
    throw new Error(`Login failed: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token;
}

async function createFlow(token, name) {
  const res = await request('POST', '/api/v1/flows', { name, active: false }, token);
  if (!res.body?.data?.id) throw new Error(`Create flow failed for "${name}": ${JSON.stringify(res.body)}`);
  return res.body.data;
}

async function createStep(token, flowId, stepData) {
  const res = await request('POST', '/api/v1/steps', { flowId, ...stepData }, token);
  if (!res.body?.data?.id) throw new Error(`Create step failed: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

async function activateFlow(token, flowId) {
  const res = await request('PATCH', `/api/v1/flows/${flowId}`, { active: true }, token);
  return res.body?.data;
}

// ─── Flow definitions ─────────────────────────────────────────────────────────
// Each flow: { name, steps[] }  steps[0] must be the trigger.
// appKey 'webhook' + event 'newWebhookPayloadReceived' is the generic webhook trigger.
// For action apps, install the integration in the Automatisch UI first.

const FLOWS = [
  {
    envKey: 'FLOW_WEBHOOK_CONTACT_CAPTURE',
    name:   '01 — Contact Capture',
    steps: [
      {
        key:  'newWebhookPayloadReceived',
        name: 'Webhook: Bot /start trigger',
        type: 'trigger',
        appKey: 'webhook',
        parameters: {},
      },
    ],
  },
  {
    envKey: 'FLOW_WEBHOOK_INTAKE',
    name:   '02 — Intake Submission & Email Registration',
    steps: [
      {
        key:  'newWebhookPayloadReceived',
        name: 'Webhook: Bot /register trigger',
        type: 'trigger',
        appKey: 'webhook',
        parameters: {},
      },
    ],
  },
  {
    envKey: 'FLOW_WEBHOOK_TRUST_INQUIRY',
    name:   '03 — Trust Package Inquiry',
    steps: [
      {
        key:  'newWebhookPayloadReceived',
        name: 'Webhook: Bot /trust or /intake trigger',
        type: 'trigger',
        appKey: 'webhook',
        parameters: {},
      },
    ],
  },
  {
    envKey: 'FLOW_WEBHOOK_ACADEMY_INQUIRY',
    name:   '04 — Academy Course Inquiry',
    steps: [
      {
        key:  'newWebhookPayloadReceived',
        name: 'Webhook: Bot /academy trigger',
        type: 'trigger',
        appKey: 'webhook',
        parameters: {},
      },
    ],
  },
  {
    envKey: 'FLOW_WEBHOOK_ADMIN_ALERT',
    name:   '05 — Admin Alert — High-Value Signal',
    steps: [
      {
        key:  'newWebhookPayloadReceived',
        name: 'Webhook: High-value keyword detected',
        type: 'trigger',
        appKey: 'webhook',
        parameters: {},
      },
    ],
  },
  {
    envKey: 'FLOW_WEBHOOK_STRIPE_PAYMENT',
    name:   '06 — Stripe Payment Received',
    steps: [
      {
        key:  'newWebhookPayloadReceived',
        name: 'Webhook: Stripe checkout.session.completed',
        type: 'trigger',
        appKey: 'webhook',
        parameters: {},
      },
    ],
  },
  {
    envKey: 'FLOW_WEBHOOK_TRUST_DELIVERY',
    name:   '07 — Trust Package Order Fulfillment',
    steps: [
      {
        key:  'newWebhookPayloadReceived',
        name: 'Webhook: Trust package payment confirmed',
        type: 'trigger',
        appKey: 'webhook',
        parameters: {},
      },
    ],
  },
  {
    envKey: 'FLOW_WEBHOOK_COURSE_ENROLLMENT',
    name:   '08 — Academy Course Enrollment',
    steps: [
      {
        key:  'newWebhookPayloadReceived',
        name: 'Webhook: Course payment confirmed',
        type: 'trigger',
        appKey: 'webhook',
        parameters: {},
      },
    ],
  },
  {
    envKey: 'FLOW_WEBHOOK_CONSULTATION',
    name:   '09 — Consultation Booking',
    steps: [
      {
        key:  'newWebhookPayloadReceived',
        name: 'Webhook: Intake form complete with booking request',
        type: 'trigger',
        appKey: 'webhook',
        parameters: {},
      },
    ],
  },
  {
    envKey: 'FLOW_WEBHOOK_DAILY_REPORT',
    name:   '10 — Daily Engagement Report',
    steps: [
      {
        key:  'everyDay',
        name: 'Schedule: Daily at 09:00',
        type: 'trigger',
        appKey: 'scheduler',
        parameters: { hour: '9', minute: '0' },
      },
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nConnecting to Automatisch at ${BASE_URL}...\n`);

  let token;
  try {
    token = await login();
    console.log('✅ Authenticated\n');
  } catch (err) {
    console.error('❌ Authentication failed:', err.message);
    process.exit(1);
  }

  const results = [];

  for (const flowDef of FLOWS) {
    process.stdout.write(`Creating flow: ${flowDef.name} ... `);
    try {
      const flow = await createFlow(token, flowDef.name);
      const triggerStep = await createStep(token, flow.id, flowDef.steps[0]);
      await activateFlow(token, flow.id);

      const webhookUrl = triggerStep.webhookUrl
        || `${BASE_URL}/webhooks/${triggerStep.id}`;

      results.push({ envKey: flowDef.envKey, url: webhookUrl, flowId: flow.id });
      console.log(`✅ ${flow.id}`);
    } catch (err) {
      console.log(`❌ ${err.message}`);
    }
  }

  console.log('\n─── Copy these into your .env.automatisch and Vercel env vars ───\n');
  for (const r of results) {
    console.log(`${r.envKey}=${r.url}`);
  }
  console.log('\nThen add each flow\'s action steps via the Automatisch UI at:');
  console.log(`${BASE_URL}\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
