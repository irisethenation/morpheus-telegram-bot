/**
 * Morpheus Orchestrator — super-agent with complete override control.
 *
 * All agent tasks are dispatched through here. Morpheus consults Trinity
 * before every user interaction to resolve segment, then routes to the
 * correct sub-agent. Morpheus may intercept any sub-agent at any time
 * via override().
 *
 * Override precedence: Morpheus > any registered sub-agent.
 */

const { v4: uuidv4 } = require('uuid');
const { SEGMENTS, SEGMENT_ROUTING } = require('./studentSegments');

const AGENT_TYPES = {
  TRUST:    'TrustAgent',
  ACADEMY:  'AcademyAgent',
  PAYMENT:  'PaymentAgent',
  PUBLISHER:'PublisherAgent',
  EMAIL:    'EmailAgent',
  TRINITY:  'TrinityAgent',
  CONTENT:  'ContentAgent'
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
    this._register(require('./agents/trinityAgent'));
    this._register(require('./agents/contentAgent'));

    // Email locked at startup — operator must explicitly release.
    this.override(AGENT_TYPES.EMAIL, async () => {
      throw new Error('[MORPHEUS] Email sending is locked. Operator approval required.');
    });
  }

  _register(agent) {
    this._registry.set(agent.agentType, agent.execute);
    console.log(`[MORPHEUS] Registered: ${agent.agentType}`);
  }

  // Install or release a Morpheus-level override on a sub-agent type.
  // Pass null to release. fn receives (context, meta) and must return a result object.
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
      console.log(`[MORPHEUS INTERCEPT] ${agentType} task ${agentId}`);
      return this._overrides.get(agentType)(context, meta);
    }

    const execute = this._registry.get(agentType);
    if (!execute) throw new Error(`Unknown agent type: ${agentType}`);

    return execute(context, meta);
  }

  // Resolve a user's segment via Trinity, then route to the correct agent.
  async routeUser(userId, firstName, text) {
    const intel = await this.dispatch(AGENT_TYPES.TRINITY, { userId, firstName });
    const segment = intel.segment || SEGMENTS.UNKNOWN;
    const routing = SEGMENT_ROUTING[segment];

    console.log(`[MORPHEUS ROUTE] ${firstName} → ${segment} → ${routing.primaryAgent}`);

    // If the user's message maps to a different agent than their segment default,
    // honour the explicit intent but personalise the greeting.
    const intentAgent = this._classifyIntent(text);
    const targetAgent = intentAgent || routing.primaryAgent;

    const result = await this.dispatch(targetAgent, {
      action: routing.action,
      userId,
      firstName,
      segment,
      greeting: routing.greeting
    });

    return result;
  }

  // Classify free-text intent. Returns null if no clear signal.
  _classifyIntent(text) {
    if (!text) return null;
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
    return null;
  }
}

const orchestrator = new MorpheusOrchestrator();

module.exports = orchestrator;
module.exports.AGENT_TYPES = AGENT_TYPES;
