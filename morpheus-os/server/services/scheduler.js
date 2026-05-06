'use strict';

const cron = require('node-cron');

const registry = [];

/**
 * Register a scheduled job.
 * @param {string} name
 * @param {string} cronExpr  — standard 5-field cron expression
 * @param {Function} fn      — async function to execute
 */
function register(name, cronExpr, fn) {
  const task = cron.schedule(cronExpr, async () => {
    console.log(`[SCHEDULER] Running: ${name}`);
    try {
      await fn();
      console.log(`[SCHEDULER] Completed: ${name}`);
    } catch (err) {
      console.error(`[SCHEDULER] Error in ${name}:`, err.message);
    }
  }, { scheduled: false });

  registry.push({ name, cronExpr, task });
  console.log(`[SCHEDULER] Registered: ${name} (${cronExpr})`);
}

function startAll() {
  registry.forEach(({ name, task }) => {
    task.start();
    console.log(`[SCHEDULER] Started: ${name}`);
  });
}

function stopAll() {
  registry.forEach(({ task }) => task.stop());
}

function list() {
  return registry.map(({ name, cronExpr }) => ({ name, cronExpr }));
}

module.exports = { register, startAll, stopAll, list };
