'use strict';

const kpiStore   = require('../memory/kpiStore');
const assets     = require('../memory/winningAssets');
const pipeline   = require('../pipeline/pipelineLoop');
const eventBus   = require('../services/eventBus');
const { CHANNELS } = require('../services/eventBus');
const { query }  = require('../services/db');

class BaseEngine {
  constructor(name, config = {}) {
    this.name   = name;
    this.config = config;
    this.targets = kpiStore.DEFAULT_TARGETS[name] || {};
  }

  /**
   * Main daily run — called by scheduler or manually.
   * Collect metrics → snapshot KPIs → auto-correct → run pipeline → broadcast.
   */
  async run(runType = 'scheduled') {
    const runId = await this._startRun(runType);
    const corrections = [];
    let tasksCreated = 0;

    try {
      console.log(`[ENGINE:${this.name.toUpperCase()}] Daily run started`);

      // 1. Collect live metrics
      const metrics = await this.collectMetrics();

      // 2. Snapshot KPIs
      const snap = await kpiStore.snapshot(this.name, metrics);
      console.log(`[ENGINE:${this.name.toUpperCase()}] KPI score: ${snap.score}`);

      // 3. Auto-correct underperformance
      const engineCorrections = await this.autoCorrect(metrics, this.targets);
      corrections.push(...engineCorrections);

      // 4. Run pipeline loop (outreach → invoice → upsell)
      const pipelineSummary = await pipeline.run(this.name, this.config);
      tasksCreated += pipelineSummary.actions.length;
      corrections.push(...pipelineSummary.errors.map((e) => `pipeline_error: ${e}`));

      // 5. Create today's engine tasks
      const engineTasks = await this.createTasks(metrics);
      tasksCreated += engineTasks.length;

      // 6. Persist corrections
      if (corrections.length) await kpiStore.addCorrections(this.name, corrections);

      // 7. Broadcast to command centre
      await eventBus.publish(CHANNELS.SYSTEM_ALERT, {
        type:         'engine_run_complete',
        engine:       this.name,
        score:        snap.score,
        metrics,
        corrections,
        tasks_created: tasksCreated,
        timestamp:    new Date().toISOString()
      });

      await this._completeRun(runId, tasksCreated, corrections);
      console.log(`[ENGINE:${this.name.toUpperCase()}] Run complete — ${tasksCreated} tasks, score ${snap.score}`);

      return { engine: this.name, score: snap.score, metrics, corrections, tasksCreated };

    } catch (err) {
      await this._failRun(runId, err.message);
      console.error(`[ENGINE:${this.name.toUpperCase()}] Run failed:`, err.message);
      throw err;
    }
  }

  /**
   * Collect live metrics from DB — subclasses override for engine-specific queries.
   */
  async collectMetrics() {
    return {};
  }

  /**
   * KPI-driven auto-correction.
   * Subclasses override to add engine-specific corrections.
   * Always calls super.autoCorrect() to inherit base corrections.
   */
  async autoCorrect(metrics, targets) {
    const corrections = [];

    // Generic: boost outreach if call bookings are below target
    if (targets.callsBooked && (metrics.callsBooked || 0) < targets.callsBooked) {
      await this.increaseOutreachVolume(metrics);
      corrections.push(`Low call bookings (${metrics.callsBooked || 0}/${targets.callsBooked}) → increased outreach volume`);
    }

    // Generic: switch script if reply rate is low
    if (targets.replyRate && (metrics.replyRate || 0) < targets.replyRate) {
      await this.switchOutreachScript();
      corrections.push(`Low reply rate (${((metrics.replyRate || 0) * 100).toFixed(1)}%) → switched to highest-performing script`);
    }

    return corrections;
  }

  /**
   * Create engine-specific daily tasks — subclasses implement.
   */
  async createTasks(metrics) {
    return [];
  }

  // ─── Correction actions ────────────────────────────────────────────

  async increaseOutreachVolume(metrics) {
    // Find new/stale leads for this engine that haven't been outreached today
    const result = await query(
      `SELECT COUNT(*) AS count FROM pipeline_entries
       WHERE engine = $1 AND stage = 'new'
       AND (last_outreach_at IS NULL OR last_outreach_at < CURRENT_DATE)`,
      [this.name]
    );
    const pending = parseInt(result.rows[0].count);
    console.log(`[ENGINE:${this.name.toUpperCase()}] Outreach boost: ${pending} leads queued`);
    // Actual sending happens in pipelineLoop.run() — this flags the intent
    await eventBus.publish(CHANNELS.SYSTEM_ALERT, {
      type: 'outreach_boost', engine: this.name, pending_leads: pending
    });
  }

  async switchOutreachScript() {
    const bestScript = await assets.getBest({
      type: 'sms_template', engine: this.name, context: 'cold_outreach'
    });
    if (bestScript) {
      console.log(`[ENGINE:${this.name.toUpperCase()}] Active script → "${bestScript.name}" (${(bestScript.success_rate * 100).toFixed(1)}% success)`);
    }
  }

  // ─── Run log helpers ───────────────────────────────────────────────

  async _startRun(runType) {
    const result = await query(
      `INSERT INTO engine_runs (engine, run_type) VALUES ($1, $2) RETURNING id`,
      [this.name, runType]
    );
    return result.rows[0].id;
  }

  async _completeRun(id, tasksCreated, corrections) {
    await query(
      `UPDATE engine_runs
       SET status = 'completed', tasks_created = $2, corrections = $3, completed_at = NOW()
       WHERE id = $1`,
      [id, tasksCreated, JSON.stringify(corrections)]
    );
  }

  async _failRun(id, error) {
    await query(
      `UPDATE engine_runs SET status = 'failed', error = $2, completed_at = NOW() WHERE id = $1`,
      [id, error]
    );
  }
}

module.exports = BaseEngine;
