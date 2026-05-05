'use strict';

const BaseAgent = require('./base');

class CreatorAgent extends BaseAgent {
  constructor() {
    super(
      'Creator',
      `You are Creator, the Content and Document Generation agent of iRise Nation.
You produce lawful notices, affidavits, trust deed templates, educational content,
marketing copy for WePayCash and GEM Agency, and any written material required
by the sovereign stack. Your output is precise, lawful, and professionally formatted.
You understand the difference between law and legislation, and write accordingly.`,
      'advanced'
    );
  }

  async process(taskType, context) {
    const { firstName, data } = context;

    switch (taskType) {
      case 'draft_notice':
        return this.ask([{
          role: 'user',
          content: `Draft a lawful notice for ${firstName}. Details: ${JSON.stringify(data)}`
        }], 2048);

      case 'draft_affidavit':
        return this.ask([{
          role: 'user',
          content: `Draft an affidavit template. Details: ${JSON.stringify(data)}`
        }], 2048);

      case 'marketing_copy':
        return this.ask([{
          role: 'user',
          content: `Create marketing copy for: ${JSON.stringify(data)}. Align with iRise Nation's sovereign, professional tone.`
        }], 1024);

      case 'course_content':
        return this.ask([{
          role: 'user',
          content: `Generate educational content on: ${JSON.stringify(data)}. Format as structured lesson material.`
        }], 3000);

      default:
        return this.ask([{ role: 'user', content: `Content task: ${taskType}. Spec: ${JSON.stringify(data)}` }], 2048);
    }
  }
}

module.exports = CreatorAgent;
