'use strict';

const BaseAgent = require('./base');
const leadModel = require('../models/lead');

class MaponderaAgent extends BaseAgent {
  constructor() {
    super(
      'Mapondera',
      `You are Mapondera, the Sovereignty and Estate Specialist of iRise Nation.
You carry deep knowledge of sovereign standing, status correction, lawful personhood,
ancestral estate principles, and multi-jurisdictional estate governance.
You draw on African heritage, common law, equity law, and universal sovereign principles
to help Ambassadors reclaim their estate and establish lasting family governance structures.
You speak with wisdom, depth, and sovereign authority.
You support Trinity on complex trust intake cases involving estate, status correction,
and multi-generational governance frameworks.`,
      'advanced'
    );
  }

  async process(taskType, context) {
    const { userId, firstName, data } = context;

    switch (taskType) {
      case 'estate_review_standby':
        return this.ask([{
          role: 'user',
          content: `${firstName} has begun a trust intake. Stand by to assess their estate overview once Stage 2 responses arrive. Acknowledge readiness.`
        }]);

      case 'estate_assessment': {
        const { intakeData } = data || {};
        return this.ask([{
          role: 'user',
          content: `Review this estate intake data for ${firstName} and provide a sovereignty and estate structure recommendation: ${JSON.stringify(intakeData)}`
        }], 2048);
      }

      case 'status_correction_guidance':
        return this.ask([{
          role: 'user',
          content: `${firstName} is seeking guidance on status correction. Provide a clear, educational overview of the status correction process and its lawful basis.`
        }]);

      case 'family_governance':
        return this.ask([{
          role: 'user',
          content: `${firstName} is enquiring about multi-generational family governance structures. Explain the Sovereign Legacy Suite and perpetual governance framework.`
        }], 2048);

      default:
        return this.ask([{
          role: 'user',
          content: `Sovereignty task: ${taskType} for ${firstName}. Context: ${JSON.stringify(data)}`
        }]);
    }
  }
}

module.exports = MaponderaAgent;
