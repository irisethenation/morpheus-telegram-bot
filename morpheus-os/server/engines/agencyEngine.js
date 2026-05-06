'use strict';

const BaseEngine = require('./baseEngine');
const { query }  = require('../services/db');
const orchestrator = require('../agents/orchestrator');
const { v4: uuidv4 } = require('uuid');

class AgencyEngine extends BaseEngine {
  constructor() {
    super('agency', {
      staleHours:    48,
      maxOutreach:   5,
      vapiAssistantId: process.env.VAPI_ASSISTANT_AGENCY
    });
  }

  async collectMetrics() {
    const today = 'CURRENT_DATE';

    const [calls, proposals, contracts, pipeline, revenue] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM outreach_events oe
             JOIN pipeline_entries pe ON pe.id = oe.pipeline_id
             WHERE pe.engine = 'agency' AND oe.outcome = 'booked'
             AND oe.created_at::date = ${today}`),
      query(`SELECT COUNT(*) AS c FROM pipeline_entries
             WHERE engine = 'agency' AND stage IN ('call_done','closed','invoiced','upsold')
             AND updated_at::date = ${today}`),
      query(`SELECT COUNT(*) AS c FROM pipeline_entries
             WHERE engine = 'agency' AND stage IN ('closed','invoiced','upsold')
             AND closed_at::date = ${today}`),
      query(`SELECT COUNT(*) FILTER (WHERE stage = 'outreach_sent') AS outreach,
                    COUNT(*) FILTER (WHERE stage = 'replied')        AS replied,
                    COUNT(*) FILTER (WHERE stage = 'call_booked')    AS booked
             FROM pipeline_entries WHERE engine = 'agency'`),
      query(`SELECT COALESCE(SUM(deal_value_gbp),0) AS rev FROM pipeline_entries
             WHERE engine = 'agency' AND stage IN ('closed','invoiced','upsold')
             AND closed_at::date = ${today}`)
    ]);

    const outreachCount = parseInt(pipeline.rows[0].outreach) || 0;
    const repliedCount  = parseInt(pipeline.rows[0].replied) || 0;

    return {
      callsBooked:     parseInt(calls.rows[0].c) || 0,
      proposalsSent:   parseInt(proposals.rows[0].c) || 0,
      signedContracts: parseInt(contracts.rows[0].c) || 0,
      outreachSent:    outreachCount,
      replied:         repliedCount,
      replyRate:       outreachCount > 0 ? repliedCount / outreachCount : 0,
      revenueGbp:      parseFloat(revenue.rows[0].rev) || 0
    };
  }

  async autoCorrect(metrics, targets) {
    const corrections = await super.autoCorrect(metrics, targets);

    // Agency-specific: if no proposals sent, dispatch Creator to draft one
    if ((metrics.proposalsSent || 0) < targets.proposalsSent) {
      await orchestrator.dispatch({
        task_uuid:     uuidv4(),
        agent:         'creator',
        task_type:     'marketing_copy',
        dispatched_by: 'agency-engine',
        user_id:       0,
        user_name:     'Engine',
        chat_id:       0,
        data:          { context: 'agency_proposal', trigger: 'low_proposals' }
      });
      corrections.push(`Low proposals (${metrics.proposalsSent}/${targets.proposalsSent}) → Creator drafted new proposal`);
    }

    return corrections;
  }

  async createTasks(metrics) {
    const tasks = [];

    // Daily: Sigma analyses agency pipeline
    await orchestrator.dispatch({
      task_uuid: uuidv4(), agent: 'sigma', task_type: 'lead_analysis',
      dispatched_by: 'agency-engine', user_id: 0, user_name: 'Engine', chat_id: 0,
      data: { engine: 'agency', metrics }
    });
    tasks.push('sigma:lead_analysis');

    return tasks;
  }
}

module.exports = new AgencyEngine();
