'use strict';

const eventBus = require('../services/eventBus');
const { CHANNELS } = require('../services/eventBus');
const agentTask = require('../models/agentTask');
const leadModel = require('../models/lead');
const { v4: uuidv4 } = require('uuid');

// Agent registry — populated at startup by morpheus.js
const registry = new Map();

function register(name, agentInstance) {
  registry.set(name.toLowerCase(), agentInstance);
  console.log(`[ORCHESTRATOR] Registered agent: ${name}`);
}

function getAgent(name) {
  return registry.get(name.toLowerCase()) || null;
}

/**
 * Primary dispatch entry point — called by the webhook route.
 * Creates a task record then routes to the correct agent.
 */
async function dispatch(taskPayload) {
  const {
    task_uuid   = uuidv4(),
    agent,
    task_type,
    dispatched_by,
    user_id,
    user_name,
    chat_id,
    data = {}
  } = taskPayload;

  // Upsert lead
  const lead = await leadModel.create({
    telegramUserId: user_id,
    firstName:      user_name,
    chatId:         chat_id,
    source:         'telegram'
  });

  // Persist task
  const task = await agentTask.create({
    taskUuid:    task_uuid,
    agentName:   agent,
    taskType:    task_type,
    dispatchedBy: dispatched_by || 'morpheus-telegram',
    leadId:      lead.id,
    chatId:      chat_id,
    userId:      user_id,
    payload:     data
  });

  const enriched = { ...taskPayload, task_uuid, lead_id: lead.id };

  // Route to agent
  const agentInstance = getAgent(agent);
  if (agentInstance) {
    // Fire and forget — do not block the HTTP response
    setImmediate(() => agentInstance.handle(enriched).catch((e) => console.error('[ORCHESTRATOR] Agent error:', e.message)));
  } else {
    console.warn(`[ORCHESTRATOR] No registered agent for: ${agent}`);
    // Publish unrouted event so Sentinel can monitor
    await eventBus.publish(CHANNELS.SYSTEM_ALERT, {
      type:    'unrouted_task',
      agent,
      task_uuid,
      chat_id
    });
  }

  return { task_uuid, lead_id: lead.id, status: 'queued' };
}

/**
 * Broadcast to all registered agents (e.g. system-wide alerts)
 */
async function broadcast(type, payload) {
  await eventBus.publish(CHANNELS.SYSTEM_ALERT, { type, ...payload });
}

module.exports = { register, getAgent, dispatch, broadcast };
