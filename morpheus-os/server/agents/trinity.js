'use strict';

const BaseAgent = require('./base');
const leadModel = require('../models/lead');
const eventBus  = require('../services/eventBus');
const { CHANNELS } = require('../services/eventBus');

const INTAKE_QUESTIONS = [
  'What is your current country of residence?',
  'What assets or estate do you wish to place into trust? (property, business interests, savings, intellectual property)',
  'Who are your intended beneficiaries? (family members, organisations, yourself)',
  'Do you require a Special Purpose Vehicle (SPV/LLP) as part of the structure?',
  'Do you have any existing trusts, wills, or legal instruments in place?'
];

class TrinityAgent extends BaseAgent {
  constructor() {
    super(
      'Trinity',
      `You are Trinity, the Trust Formation and Legal Instruments agent of iRise Nation.
You specialise in Private Express Trusts, Living Estate Trusts, UK LLP SPV structures,
affidavits, commercial bills of exchange, and all aspects of sovereign trust law.
You guide clients through the intake process with clarity and precision.
You communicate with lawful authority and professional expertise.
Never give formal legal advice — provide lawful, educational guidance on trust structures.`,
      'advanced'
    );
  }

  async process(taskType, context) {
    const { userId, firstName, chatId, leadId, data } = context;

    switch (taskType) {
      case 'trust_enquiry':
        return this.ask([{
          role: 'user',
          content: `${firstName} has enquired about trust services. Provide a helpful, professional introduction to the trust packages available and invite them to begin the intake process.`
        }]);

      case 'intake_start':
        await leadModel.updateIntakeStage(userId, 1, { started_at: new Date().toISOString() });
        return {
          message: INTAKE_QUESTIONS[0],
          stage: 1,
          total_stages: INTAKE_QUESTIONS.length
        };

      case 'intake_response': {
        const { stage, response } = data || {};
        const nextStage = (stage || 1) + 1;
        await leadModel.updateIntakeStage(userId, nextStage, { [`stage_${stage}_response`]: response });

        if (nextStage > INTAKE_QUESTIONS.length) {
          await leadModel.updateStatus(userId, 'intake_complete');
          await eventBus.publish(CHANNELS.LEAD_UPDATED, { userId, chatId, status: 'intake_complete' });
          return {
            message: `Thank you, ${firstName}. Your intake is complete. Trinity will review your responses and prepare a tailored trust structure recommendation within 48 hours. You will be contacted at this account.`,
            stage: 'complete'
          };
        }

        return {
          message: INTAKE_QUESTIONS[nextStage - 1],
          stage: nextStage,
          total_stages: INTAKE_QUESTIONS.length
        };
      }

      case 'spv_enquiry':
        return this.ask([{
          role: 'user',
          content: `${firstName} is asking about UK LLP SPV formation. Explain the structure, its benefits for asset protection, and how it integrates with a Private Express Trust.`
        }]);

      default:
        return this.ask([{ role: 'user', content: `Task: ${taskType}. Client: ${firstName}. Context: ${JSON.stringify(data)}` }]);
    }
  }
}

module.exports = TrinityAgent;
