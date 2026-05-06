'use strict';

const axios = require('axios');
const env   = require('../config/env');

const BASE_URL = 'https://api.vapi.ai';

function headers() {
  return {
    Authorization: `Bearer ${env.vapi.apiKey}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Initiate an AI-powered outbound call via VAPI.
 * @param {object} opts
 * @param {string} opts.to               - E.164 phone number
 * @param {string} opts.assistantId      - VAPI assistant ID
 * @param {object} [opts.assistantOverrides] - Runtime variable overrides
 * @param {object} [opts.metadata]       - Arbitrary metadata passed back in webhooks
 */
async function call({ to, assistantId, assistantOverrides = {}, metadata = {} }) {
  const payload = {
    phoneNumberId: env.vapi.phoneNumberId,
    customer: { number: to },
    assistantId,
    assistantOverrides,
    metadata
  };

  const response = await axios.post(`${BASE_URL}/call/phone`, payload, { headers: headers() });
  const call = response.data;

  console.log(`[VAPI] Call initiated to ${to}: ${call.id}`);
  return { callId: call.id, status: call.status };
}

/**
 * Retrieve a call record by ID.
 */
async function getCall(callId) {
  const response = await axios.get(`${BASE_URL}/call/${callId}`, { headers: headers() });
  return response.data;
}

/**
 * List recent calls — useful for Sentinel monitoring.
 */
async function listCalls({ limit = 20, createdAtGt } = {}) {
  const params = { limit };
  if (createdAtGt) params.createdAtGt = createdAtGt;

  const response = await axios.get(`${BASE_URL}/call`, { headers: headers(), params });
  return response.data;
}

module.exports = { call, getCall, listCalls };
