'use strict';

const eventBus = require('../services/eventBus');
const { CHANNELS } = require('../services/eventBus');
const agentTask = require('../models/agentTask');
const eventModel = require('../models/event');
const llm = require('../services/llmRouter');

class BaseAgent {
  constructor(name, systemPrompt, tier = 'standard') {
    this.name         = name;
    this.systemPrompt = systemPrompt;
    this.tier         = tier;
  }

  async handle(task) {
    const { task_uuid, task_type, user_id, user_name, chat_id, lead_id, data } = task;

    await agentTask.setInProgress(task_uuid);
    console.log(`[${this.name.toUpperCase()}] Handling task ${task_uuid} (${task_type})`);

    try {
      const result = await this.process(task_type, { userId: user_id, firstName: user_name, chatId: chat_id, leadId: lead_id, data });

      await agentTask.complete(task_uuid, result);

      await eventModel.log({
        type:      task_type,
        agentName: this.name,
        leadId:    lead_id || null,
        chatId:    chat_id,
        payload:   { task_uuid, result },
        status:    'ok'
      });

      await eventBus.publish(CHANNELS.AGENT_RESULT, {
        agent:     this.name,
        task_uuid,
        task_type,
        chat_id,
        result
      });

      return result;

    } catch (err) {
      console.error(`[${this.name.toUpperCase()}] Task ${task_uuid} failed:`, err.message);

      await agentTask.fail(task_uuid, err.message);

      await eventModel.log({
        type:      task_type,
        agentName: this.name,
        leadId:    lead_id || null,
        chatId:    chat_id,
        payload:   { task_uuid, error: err.message },
        status:    'error'
      });

      throw err;
    }
  }

  // Subclasses override this
  async process(taskType, context) {
    return this.ask([{ role: 'user', content: `Task: ${taskType}\nContext: ${JSON.stringify(context)}` }]);
  }

  async ask(messages, maxTokens = 1024) {
    return llm.chat({
      system:    this.systemPrompt,
      messages,
      tier:      this.tier,
      maxTokens
    });
  }
}

module.exports = BaseAgent;
