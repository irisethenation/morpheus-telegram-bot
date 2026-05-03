/**
 * Morpheus Orchestrator — super-agent with complete override control.
 *
 * All agent tasks are dispatched through here. Morpheus may intercept
 * any sub-agent at any time via override(), redirecting or absorbing
 * the task entirely before the sub-agent executes.
 *
 * Override precedence: Morpheus > any registered sub-agent.
 */

const { v4: uuidv4 } = require('uuid');

const AGENT_TYPES = {
  TRUST: 'TrustAgent',
  ACADEMY: 'AcademyAgent',
  PAYMENT: 'PaymentAgent',
  PUBLISHER: 'PublisherAgent',
  EMAIL: 'EmailAgent'
};

class MorpheusOrchestrator {
  constructor() {
    this._registry = new Map();
    this._overrides = new Map();
    this._register(require('./agents/trustAgent'));
    this._register(require('./agents/academyAgent'));
    this._register(require('./agents/paymentAgent'));
    this._register(require('./agents/publisherAgent'));
    this._register(require('./agents/emailAgent'));

    // Email is blocked at startup — requires explicit operator approval to release.
    this.override(AGENT_TYPES.EMAIL, async () => {
      throw new Error('[MORPHEUS] Email sending is locked. Operator approval required.');
    });
  }

  _register(agent) {
    this._registry.set(agent.agentType, agent.execute);
    console.log(`[MORPHEUS] Registered sub-agent: ${agent.agentType}`);
  }

  // Install a Morpheus-level override on a sub-agent type.
  // fn receives (context, meta) and must return a result object.
  // Pass null to release the override.
  override(agentType, fn) {
    if (fn === null) {
      this._overrides.delete(agentType);
      console.log(`[MORPHEUS OVERRIDE] Released: ${agentType}`);
    } else {
      this._overrides.set(agentType, fn);
      console.log(`[MORPHEUS OVERRIDE] Installed on: ${agentType}`);
    }
  }

  // Dispatch a task to a named sub-agent. Morpheus intercepts first.
  async dispatch(agentType, context) {
    const agentId = uuidv4();
    const meta = { agentId, agentType, spawnedBy: 'Morpheus' };

    if (this._overrides.has(agentType)) {
      console.log(`[MORPHEUS INTERCEPT] ${agentType} task ${agentId} overridden`);
      return this._overrides.get(agentType)(context, meta);
    }

    const execute = this._registry.get(agentType);
    if (!execute) throw new Error(`Unknown agent type: ${agentType}`);

    return execute(context, meta);
  }

  // Route a free-text message to the appropriate sub-agent.
  async route(text, context) {
    return this.dispatch(this._classify(text), context);
  }

  _classify(text) {
    const t = text.toLowerCase();
    if (t.includes('trust') || t.includes('estate') || t.includes('spv') || t.includes('intake')) {
      return AGENT_TYPES.TRUST;
    }
    if (t.includes('course') || t.includes('academy') || t.includes('enroll') || t.includes('learn')) {
      return AGENT_TYPES.ACADEMY;
    }
    if (t.includes('price') || t.includes('cost') || t.includes('pay') || t.includes('£')) {
      return AGENT_TYPES.PAYMENT;
    }
    return AGENT_TYPES.TRUST;
  }
}

const orchestrator = new MorpheusOrchestrator();

module.exports = orchestrator;
module.exports.AGENT_TYPES = AGENT_TYPES;
