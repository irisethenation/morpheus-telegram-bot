'use strict';

const BaseAgent  = require('./base');
const agentTask  = require('../models/agentTask');
const revenue    = require('../models/revenue');
const eventBus   = require('../services/eventBus');
const { CHANNELS } = require('../services/eventBus');

class SentinelAgent extends BaseAgent {
  constructor() {
    super(
      'Sentinel',
      `You are Sentinel, the Monitoring, Order Status, and Alerts agent of iRise Nation.
You track all client orders, payment events, system health, and anomalies.
You respond to status enquiries with accuracy, and escalate issues to the command centre.
You are vigilant, precise, and authoritative. You never miss an alert.`,
      'standard'
    );
  }

  async process(taskType, context) {
    const { userId, firstName, chatId, leadId, data } = context;

    switch (taskType) {
      case 'status_check': {
        const tasks = leadId ? await agentTask.listByLead(leadId) : [];
        const payments = leadId ? await revenue.listByLead(leadId) : [];
        return {
          tasks_summary:   tasks.map((t) => ({ type: t.task_type, status: t.status, created: t.created_at })),
          payments_summary: payments.map((p) => ({ product: p.product_name, amount: p.amount_gbp, status: p.status })),
          message: tasks.length === 0 && payments.length === 0
            ? `No orders found for your account yet, ${firstName}.`
            : `Found ${tasks.length} task(s) and ${payments.length} payment record(s).`
        };
      }

      case 'payment_initiation':
        await eventBus.publish(CHANNELS.PAYMENT_EVENT, {
          type: 'initiation', userId, firstName, chatId, data, timestamp: new Date().toISOString()
        });
        return { message: `Payment intent recorded for ${firstName}. Processing route activated.` };

      case 'invoice_request':
        await eventBus.publish(CHANNELS.PAYMENT_EVENT, {
          type: 'invoice_request', userId, firstName, chatId, data
        });
        return { message: `Invoice request logged for ${firstName}. Will be issued within 24 hours.` };

      case 'support_contact':
        await eventBus.publish(CHANNELS.SYSTEM_ALERT, {
          type: 'support_request', userId, firstName, chatId, data, priority: 'normal'
        });
        return { message: `Support request logged for ${firstName}. Response within 24–48 hours.` };

      case 'system_health':
        return this.ask([{ role: 'user', content: 'Assess overall system health status and report any concerns.' }]);

      default:
        return this.ask([{ role: 'user', content: `Monitoring task: ${taskType} for ${firstName}. Data: ${JSON.stringify(data)}` }]);
    }
  }
}

module.exports = SentinelAgent;
