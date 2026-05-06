'use strict';

/**
 * Email Task Parser
 *
 * Receives a parsed inbound email and converts it into an agent dispatch payload.
 * Called exclusively from the /api/inbound/email route.
 *
 * Authorized senders (Patrick / iRise operations):
 *   patrick@gemtheagency.com
 *   admin@irise.academy
 *   Beneficialtitleowner@gmail.com
 *
 * Email format — subject line drives routing:
 *   [AGENT: trinity]   Subject text       → explicit agent override
 *   [URGENT]           Subject text       → priority flag
 *   Everything else → Morpheus infers agent from content
 *
 * Example emails Patrick can send:
 *   Subject: [AGENT: creator] Draft agency proposal for Acme Ltd
 *   Subject: [URGENT] Chase lead John Smith — hasn't replied in 3 days
 *   Subject: Add property lead — 45 High Street, SW1A 1AA — asking £280k
 *   Subject: [AGENT: kappa] Enroll sarah@example.com in Trust Formation course
 *   Subject: Schedule review — check all KPIs and send me a summary
 */

const llm = require('./llmRouter');
const { v4: uuidv4 } = require('uuid');

const AUTHORIZED_SENDERS = [
  'patrick@gemtheagency.com',
  'admin@irise.academy',
  'beneficialtitleowner@gmail.com'    // normalised to lowercase
];

const AGENTS = ['morpheus', 'trinity', 'phoenix', 'creator', 'sentinel', 'sigma', 'kappa', 'mapondera'];

const SYSTEM_PROMPT = `You are Morpheus, the sovereign intelligence of iRise Nation.
Patrick (the operator) has sent you an email with a task or instruction.
Your job is to parse it and return a structured JSON dispatch payload.

Respond ONLY with valid JSON in this exact shape:
{
  "agent": "<one of: morpheus|trinity|phoenix|creator|sentinel|sigma|kappa|mapondera>",
  "task_type": "<descriptive snake_case task type>",
  "priority": "<urgent|high|normal|low>",
  "summary": "<one sentence summary of what needs to happen>",
  "data": {
    <any relevant key-value pairs extracted from the email>
  },
  "reply_to_patrick": "<short confirmation message to send back to Patrick>"
}

Agent selection guide:
- trust, legal, intake, affidavit, SPV, notice → trinity
- content, proposal, draft, copy, course material → creator
- order status, payment, invoice, monitor, chase → sentinel
- analytics, report, summary, kpi, performance → sigma
- academy, enroll, course, portal, student → kappa
- sovereignty, estate, family, status correction → mapondera
- onboarding, welcome, new client → phoenix
- anything else, cross-cutting, or unclear → morpheus`;

function normaliseSender(from) {
  // Extract email from "Name <email>" format
  const match = from.match(/<(.+?)>/) || from.match(/(\S+@\S+)/);
  return (match ? match[1] : from).toLowerCase().trim();
}

function isAuthorized(from) {
  return AUTHORIZED_SENDERS.includes(normaliseSender(from));
}

function extractExplicitAgent(subject) {
  const match = subject.match(/\[AGENT:\s*(\w+)\]/i);
  if (match) {
    const name = match[1].toLowerCase();
    return AGENTS.includes(name) ? name : null;
  }
  return null;
}

function extractPriority(subject) {
  if (/\[URGENT\]/i.test(subject)) return 'urgent';
  if (/\[HIGH\]/i.test(subject))   return 'high';
  if (/\[LOW\]/i.test(subject))    return 'low';
  return 'normal';
}

async function parse({ from, subject, textBody, htmlBody, attachments = [] }) {
  if (!isAuthorized(from)) {
    return { authorized: false, reason: `Sender not authorized: ${from}` };
  }

  const body     = (textBody || htmlBody || '').slice(0, 3000);
  const priority = extractPriority(subject);
  const explicitAgent = extractExplicitAgent(subject);
  // Strip tags from subject for clean parsing
  const cleanSubject = subject.replace(/\[.*?\]/g, '').trim();

  // Use LLM to parse intent
  const llmResponse = await llm.chat({
    system: SYSTEM_PROMPT,
    tier:   'standard',
    messages: [{
      role: 'user',
      content: `FROM: ${from}
SUBJECT: ${cleanSubject}
PRIORITY: ${priority}
BODY:
${body}
${attachments.length ? `ATTACHMENTS: ${attachments.map((a) => a.name).join(', ')}` : ''}`
    }],
    maxTokens: 512
  });

  let parsed;
  try {
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    parsed = null;
  }

  if (!parsed) {
    return {
      authorized: true,
      dispatched: false,
      reason: 'Could not parse task from email',
      raw: llmResponse
    };
  }

  // Explicit agent tag overrides LLM choice
  if (explicitAgent) parsed.agent = explicitAgent;

  const dispatch = {
    task_uuid:     uuidv4(),
    agent:         parsed.agent || 'morpheus',
    task_type:     parsed.task_type || 'email_task',
    dispatched_by: `email:${normaliseSender(from)}`,
    user_id:       0,
    user_name:     'Patrick',
    chat_id:       0,
    data: {
      ...parsed.data,
      priority,
      source:    'email',
      from,
      subject:   cleanSubject,
      summary:   parsed.summary
    }
  };

  return {
    authorized:    true,
    dispatched:    true,
    dispatch,
    replyMessage:  parsed.reply_to_patrick || `Task received — dispatching to ${parsed.agent}.`,
    priority
  };
}

module.exports = { parse, isAuthorized, AUTHORIZED_SENDERS };
