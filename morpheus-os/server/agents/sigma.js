'use strict';

const BaseAgent  = require('./base');
const leadModel  = require('../models/lead');
const revenue    = require('../models/revenue');

class SigmaAgent extends BaseAgent {
  constructor() {
    super(
      'Sigma',
      `You are Sigma, the Analytics and Assessment agent of iRise Nation.
You analyse lead behaviour, revenue patterns, unclassified queries, and system data.
You surface actionable insights for the command centre and help route unclear enquiries
to the right pathway. You are analytical, precise, and data-driven.`,
      'standard'
    );
  }

  async process(taskType, context) {
    const { firstName, data } = context;

    switch (taskType) {
      case 'unclassified_query':
        return this.ask([{
          role: 'user',
          content: `An Ambassador named ${firstName} sent this unclassified message: "${data?.text}". Assess what they most likely need and suggest the best response pathway (trust services, academy, payments, or support).`
        }]);

      case 'docs_request':
        return this.ask([{
          role: 'user',
          content: `${firstName} is requesting documentation. Context: ${JSON.stringify(data)}. Identify the most relevant documents and resources from the iRise Nation knowledge base.`
        }]);

      case 'revenue_summary': {
        const summary = await revenue.summary();
        return { summary, message: 'Revenue summary retrieved.' };
      }

      case 'lead_analysis': {
        const leads = await leadModel.list({ limit: 100 });
        const statusCounts = leads.reduce((acc, l) => {
          acc[l.status] = (acc[l.status] || 0) + 1;
          return acc;
        }, {});
        return { total: leads.length, by_status: statusCounts };
      }

      default:
        return this.ask([{ role: 'user', content: `Analytics task: ${taskType}. Data: ${JSON.stringify(data)}` }]);
    }
  }
}

module.exports = SigmaAgent;
