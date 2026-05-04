/**
 * Trinity Intelligence Agent.
 *
 * Trinity holds the student registry and current enrolment state.
 * Morpheus consults Trinity before routing ANY user interaction so he
 * is never confused about who is being served what.
 *
 * Data source priority:
 *   1. Vercel KV (live state — updated by intake, payment, enrollment events)
 *   2. MORPHEUS_AGENT_ENDPOINT (Trinity's full intelligence report API)
 *   3. Fallback: UNKNOWN segment
 */

const axios = require('axios');
const { SEGMENTS } = require('../studentSegments');

// In-process cache for the duration of a serverless invocation only.
const _cache = new Map();

async function lookupUser(userId, firstName) {
  if (_cache.has(userId)) return _cache.get(userId);

  let segment = SEGMENTS.UNKNOWN;
  let profile = null;

  try {
    const endpoint = process.env.MORPHEUS_AGENT_ENDPOINT;
    if (endpoint) {
      const { data } = await axios.post(`${endpoint}/trinity/lookup`, {
        user_id: String(userId),
        user_name: firstName
      }, {
        headers: { 'x-morpheus-secret': process.env.PUBLISH_SECRET },
        timeout: 3000
      });

      if (data?.segment) segment = data.segment;
      if (data?.profile) profile = data.profile;
    }
  } catch (err) {
    // Trinity unreachable — Morpheus routes conservatively as UNKNOWN
    console.warn('[TRINITY] Lookup failed, defaulting to UNKNOWN:', err.message);
  }

  const result = { userId, firstName, segment, profile };
  _cache.set(userId, result);
  console.log(`[TRINITY] ${firstName} (${userId}) → segment: ${segment}`);
  return result;
}

async function execute(context, meta) {
  const { userId, firstName } = context;
  return lookupUser(userId, firstName);
}

module.exports = { execute, lookupUser, agentType: 'TrinityAgent' };
