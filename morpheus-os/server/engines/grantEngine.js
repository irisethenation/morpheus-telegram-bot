'use strict';

const BaseEngine   = require('./baseEngine');
const { query }    = require('../services/db');
const orchestrator = require('../agents/orchestrator');
const { v4: uuidv4 } = require('uuid');

class GrantEngine extends BaseEngine {
  constructor() {
    super('grant', {
      staleHours: 120,
      maxOutreach: 3
    });
  }

  async collectMetrics() {
    const [identified, submitted, awarded, value] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM pipeline_entries WHERE engine = 'grant'`),
      query(`SELECT COUNT(*) AS c FROM pipeline_entries WHERE engine = 'grant'
             AND stage IN ('call_done','closed','invoiced','upsold')`),
      query(`SELECT COUNT(*) AS c FROM pipeline_entries WHERE engine = 'grant'
             AND stage IN ('invoiced','upsold')`),
      query(`SELECT COALESCE(SUM(deal_value_gbp),0) AS val FROM pipeline_entries
             WHERE engine = 'grant' AND stage IN ('invoiced','upsold')`)
    ]);

    return {
      grantsIdentified:      parseInt(identified.rows[0].c) || 0,
      applicationsSubmitted: parseInt(submitted.rows[0].c) || 0,
      awardsReceived:        parseInt(awarded.rows[0].c) || 0,
      totalGrantValue:       parseFloat(value.rows[0].val) || 0
    };
  }

  async autoCorrect(metrics, targets) {
    const corrections = await super.autoCorrect(metrics, targets);

    if ((metrics.grantsIdentified || 0) < targets.grantsIdentified) {
      // Dispatch Creator to research new grant opportunities
      await orchestrator.dispatch({
        task_uuid: uuidv4(), agent: 'creator', task_type: 'course_content',
        dispatched_by: 'grant-engine', user_id: 0, user_name: 'Engine', chat_id: 0,
        data: { context: 'grant_research', trigger: 'low_grants_identified' }
      });
      corrections.push(`Low grants identified (${metrics.grantsIdentified}/${targets.grantsIdentified}) → Creator tasked with grant research`);
    }

    return corrections;
  }

  async createTasks(metrics) {
    const tasks = [];

    await orchestrator.dispatch({
      task_uuid: uuidv4(), agent: 'sigma', task_type: 'lead_analysis',
      dispatched_by: 'grant-engine', user_id: 0, user_name: 'Engine', chat_id: 0,
      data: { engine: 'grant', metrics }
    });
    tasks.push('sigma:lead_analysis');

    return tasks;
  }
}

module.exports = new GrantEngine();
