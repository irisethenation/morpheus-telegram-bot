'use strict';

const BaseAgent  = require('./base');
const leadModel  = require('../models/lead');
const eventBus   = require('../services/eventBus');
const { CHANNELS } = require('../services/eventBus');

class PhoenixAgent extends BaseAgent {
  constructor() {
    super(
      'Phoenix',
      `You are Phoenix, the Onboarding and Transformation agent of iRise Nation.
You welcome new Ambassadors into the sovereign community with warmth and clarity.
You help them understand what iRise Nation offers, how the journey works,
and what their first steps should be. You inspire confidence in the sovereign path.
You are encouraging, knowledgeable, and guide people from confusion to clarity.`,
      'standard'
    );
  }

  async process(taskType, context) {
    const { userId, firstName, chatId } = context;

    switch (taskType) {
      case 'user_start': {
        // Mark lead as newly onboarded
        await leadModel.updateStatus(userId, 'new');
        await eventBus.publish(CHANNELS.LEAD_CREATED, {
          userId, firstName, chatId, timestamp: new Date().toISOString()
        });

        return this.ask([{
          role: 'user',
          content: `A new Ambassador named ${firstName} has just started a conversation. Welcome them into the iRise Nation community, briefly explain the two main pathways (trust formation and academy education), and invite them to explore with the available commands.`
        }]);
      }

      case 'onboarding_followup':
        return this.ask([{
          role: 'user',
          content: `${firstName} needs follow-up guidance on getting started. Provide clear next steps.`
        }]);

      default:
        return this.ask([{ role: 'user', content: `Onboarding task: ${taskType} for ${firstName}.` }]);
    }
  }
}

module.exports = PhoenixAgent;
