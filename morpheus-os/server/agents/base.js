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

      // Push result back to the Telegram user who triggered the task
      if (chat_id && result) {
        const text = this._formatForTelegram(result, task_type);
        if (text) {
          await eventBus.publish(CHANNELS.TELEGRAM_SEND, {
            chat_id,
            text,
            bot:        this.telegramBot || 'morpheus',
            parse_mode: 'Markdown'
          });
        }
      }

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

  // Format agent result into a Telegram-safe message string.
  // Returns null if the task type should not echo back to the user
  // (e.g. internal engine tasks dispatched with chat_id = 0).
  _formatForTelegram(result, taskType) {
    // Engine/scheduler tasks have no real user to notify
    const internalTasks = [
      'system_health', 'kpi_review', 'learn_and_suggest', 'lead_analysis',
      'revenue_summary', 'system_alert', 'estate_review_standby',
      'portal_access_check', 'enrollment_start'
    ];
    if (internalTasks.includes(taskType)) return null;

    if (typeof result === 'string' && result.trim()) return result;

    if (result && typeof result === 'object') {
      // Intake stage responses
      if (result.message) return result.message;
      // Structured results — format as readable summary
      const lines = Object.entries(result)
        .filter(([k]) => !['stage', 'total_stages'].includes(k))
        .map(([k, v]) => `*${k}:* ${typeof v === 'object' ? JSON.stringify(v) : v}`);
      return lines.length ? lines.join('\n') : null;
    }

    return null;
  }
}

module.exports = BaseAgent;
