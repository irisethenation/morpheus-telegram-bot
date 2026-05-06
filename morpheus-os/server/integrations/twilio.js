'use strict';

const twilio = require('twilio');
const env    = require('../config/env');

let client;

function getClient() {
  if (!client) {
    if (!env.twilio.accountSid || !env.twilio.authToken) {
      throw new Error('Twilio credentials not configured');
    }
    client = twilio(env.twilio.accountSid, env.twilio.authToken);
  }
  return client;
}

async function sendSMS({ to, body }) {
  const c = getClient();
  const msg = await c.messages.create({
    from: env.twilio.fromNumber,
    to,
    body
  });
  console.log(`[TWILIO SMS] Sent to ${to}: ${msg.sid}`);
  return { sid: msg.sid, status: msg.status };
}

async function makeCall({ to, twiml }) {
  const c = getClient();
  const call = await c.calls.create({
    from: env.twilio.fromNumber,
    to,
    twiml
  });
  console.log(`[TWILIO CALL] Initiated to ${to}: ${call.sid}`);
  return { sid: call.sid, status: call.status };
}

async function sendOutreachSMS({ to, leadName, script }) {
  const body = script.replace('{{name}}', leadName || 'there');
  return sendSMS({ to, body });
}

module.exports = { sendSMS, makeCall, sendOutreachSMS };
