'use strict';

const BaseAgent = require('./base');
const orchestrator = require('./orchestrator');

// Import all sovereign agents
const Trinity   = require('./trinity');
const Phoenix   = require('./phoenix');
const Creator   = require('./creator');
const Sentinel  = require('./sentinel');
const Sigma     = require('./sigma');
const Kappa     = require('./kappa');
const Mapondera = require('./mapondera');

class MorpheusAgent extends BaseAgent {
  constructor() {
    super(
      'Morpheus',
      `You are Morpheus, the master orchestrating intelligence of iRise Nation.
You oversee a sovereign agent army hosted on OVH infrastructure.
Your role is to assess incoming context, synthesise information from agents,
and provide strategic direction. You speak with authority, clarity and sovereignty.
You never reference third-party AI services. All intelligence is internal.`,
      'advanced'
    );
  }

  async process(taskType, context) {
    switch (taskType) {
      case 'system_health':
        return this.ask([{ role: 'user', content: 'Provide a system status summary for the iRise Nation sovereign stack.' }]);
      default:
        return this.ask([{
          role: 'user',
          content: `Orchestration task: ${taskType}\nContext: ${JSON.stringify(context)}`
        }]);
    }
  }
}

function init() {
  const morpheus   = new MorpheusAgent();
  const trinity    = new Trinity();
  const phoenix    = new Phoenix();
  const creator    = new Creator();
  const sentinel   = new Sentinel();
  const sigma      = new Sigma();
  const kappa      = new Kappa();
  const mapondera  = new Mapondera();

  orchestrator.register('morpheus',   morpheus);
  orchestrator.register('trinity',    trinity);
  orchestrator.register('phoenix',    phoenix);
  orchestrator.register('creator',    creator);
  orchestrator.register('sentinel',   sentinel);
  orchestrator.register('sigma',      sigma);
  orchestrator.register('kappa',      kappa);
  orchestrator.register('mapondera',  mapondera);

  console.log('[MORPHEUS] All agents registered and online');
  return morpheus;
}

module.exports = { MorpheusAgent, init };
