'use strict';

const BaseEngine   = require('./baseEngine');
const { query }    = require('../services/db');
const orchestrator = require('../agents/orchestrator');
const assets       = require('../memory/winningAssets');
const { v4: uuidv4 } = require('uuid');

class AcademyEngine extends BaseEngine {
  constructor() {
    super('academy', {
      staleHours: 24,
      maxOutreach: 3,
      vapiAssistantId: process.env.VAPI_ASSISTANT_ACADEMY
    });
  }

  async collectMetrics() {
    const [enrollments, completions, upsells, revenue, outreach, replied] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM pipeline_entries WHERE engine = 'academy'
             AND stage NOT IN ('new')`),
      query(`SELECT COUNT(*) AS c FROM pipeline_entries WHERE engine = 'academy'
             AND stage IN ('upsold','closed','invoiced')`),
      query(`SELECT COUNT(*) AS c FROM pipeline_entries WHERE engine = 'academy'
             AND upsell_offered = TRUE AND stage = 'upsold'`),
      query(`SELECT COALESCE(SUM(deal_value_gbp),0) AS rev FROM pipeline_entries
             WHERE engine = 'academy' AND stage IN ('invoiced','upsold')`),
      query(`SELECT COUNT(*) AS c FROM outreach_events oe
             JOIN pipeline_entries pe ON pe.id = oe.pipeline_id
             WHERE pe.engine = 'academy' AND oe.created_at::date = CURRENT_DATE`),
      query(`SELECT COUNT(*) AS c FROM pipeline_entries
             WHERE engine = 'academy' AND reply_received = TRUE`)
    ]);

    const outreachCount = parseInt(outreach.rows[0].c) || 0;
    const repliedCount  = parseInt(replied.rows[0].c) || 0;

    return {
      enrollments:       parseInt(enrollments.rows[0].c) || 0,
      courseCompletions: parseInt(completions.rows[0].c) || 0,
      upsells:           parseInt(upsells.rows[0].c) || 0,
      revenueGbp:        parseFloat(revenue.rows[0].rev) || 0,
      outreachSent:      outreachCount,
      replyRate:         outreachCount > 0 ? repliedCount / outreachCount : 0
    };
  }

  async autoCorrect(metrics, targets) {
    const corrections = await super.autoCorrect(metrics, targets);

    // Academy-specific: if enrollments low, dispatch Kappa to run enrollment campaign
    if ((metrics.enrollments || 0) < targets.enrollments) {
      await orchestrator.dispatch({
        task_uuid: uuidv4(), agent: 'kappa', task_type: 'enrollment_start',
        dispatched_by: 'academy-engine', user_id: 0, user_name: 'Engine', chat_id: 0,
        data: { trigger: 'low_enrollments', metrics }
      });
      corrections.push(`Low enrollments (${metrics.enrollments}/${targets.enrollments}) → Kappa triggered enrollment campaign`);
    }

    // If upsells below target, activate best upsell offer
    if ((metrics.upsells || 0) < targets.upsells) {
      const bestOffer = await assets.getBest({ type: 'offer', engine: 'academy', context: 'upsell' });
      if (bestOffer) {
        corrections.push(`Low upsells → activated offer: "${bestOffer.name}" (${(bestOffer.success_rate * 100).toFixed(1)}%)`);
      }
    }

    return corrections;
  }

  async createTasks(metrics) {
    const tasks = [];

    // Daily: Kappa checks portal access and student engagement
    await orchestrator.dispatch({
      task_uuid: uuidv4(), agent: 'kappa', task_type: 'portal_access_check',
      dispatched_by: 'academy-engine', user_id: 0, user_name: 'Engine', chat_id: 0,
      data: { engine: 'academy', metrics, daily: true }
    });
    tasks.push('kappa:portal_access_check');

    // Daily: Sigma analyses academy lead pipeline
    await orchestrator.dispatch({
      task_uuid: uuidv4(), agent: 'sigma', task_type: 'lead_analysis',
      dispatched_by: 'academy-engine', user_id: 0, user_name: 'Engine', chat_id: 0,
      data: { engine: 'academy', metrics }
    });
    tasks.push('sigma:lead_analysis');

    return tasks;
  }
}

module.exports = new AcademyEngine();
