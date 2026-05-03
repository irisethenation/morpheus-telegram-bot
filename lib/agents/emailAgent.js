async function execute(context, meta) {
  // Execution should never reach here — the Morpheus orchestrator
  // installs a blocking override on this agent at startup.
  throw new Error('[EmailAgent] Blocked: operator approval required before sending email.');
}

module.exports = { execute, agentType: 'EmailAgent' };
