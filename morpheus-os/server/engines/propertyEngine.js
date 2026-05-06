'use strict';

const BaseEngine   = require('./baseEngine');
const { query }    = require('../services/db');
const orchestrator = require('../agents/orchestrator');
const propertyComps = require('../integrations/propertyComps');
const kpiStore     = require('../memory/kpiStore');
const { v4: uuidv4 } = require('uuid');

class PropertyEngine extends BaseEngine {
  constructor() {
    super('property', {
      staleHours:    72,
      maxOutreach:   4,
      vapiAssistantId: process.env.VAPI_ASSISTANT_PROPERTY
    });
  }

  async collectMetrics() {
    const [generated, offers, underOffer, completions, revenue] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM pipeline_entries WHERE engine = 'property'`),
      query(`SELECT COUNT(*) AS c FROM pipeline_entries WHERE engine = 'property'
             AND stage IN ('call_booked','call_done','closed','invoiced','upsold')`),
      query(`SELECT COUNT(*) AS c FROM pipeline_entries WHERE engine = 'property'
             AND stage IN ('call_done','closed')`),
      query(`SELECT COUNT(*) AS c FROM pipeline_entries WHERE engine = 'property'
             AND stage IN ('invoiced','upsold')`),
      query(`SELECT COALESCE(SUM(deal_value_gbp),0) AS rev FROM pipeline_entries
             WHERE engine = 'property' AND stage IN ('invoiced','upsold')`)
    ]);

    return {
      leadsGenerated:   parseInt(generated.rows[0].c) || 0,
      offersSubmitted:  parseInt(offers.rows[0].c) || 0,
      dealsUnderOffer:  parseInt(underOffer.rows[0].c) || 0,
      completions:      parseInt(completions.rows[0].c) || 0,
      revenueGbp:       parseFloat(revenue.rows[0].rev) || 0
    };
  }

  async autoCorrect(metrics, targets) {
    const corrections = await super.autoCorrect(metrics, targets);

    // Property-specific: if leads generated is below target, run property comps scan
    if ((metrics.leadsGenerated || 0) < targets.leadsGenerated) {
      await this._runCompsRefresh();
      corrections.push(`Low leads (${metrics.leadsGenerated}/${targets.leadsGenerated}) → property comps refresh triggered`);
    }

    // If offers below target, dispatch Mapondera for estate strategy review
    if ((metrics.offersSubmitted || 0) < targets.offersSubmitted) {
      await orchestrator.dispatch({
        task_uuid: uuidv4(), agent: 'mapondera', task_type: 'estate_assessment',
        dispatched_by: 'property-engine', user_id: 0, user_name: 'Engine', chat_id: 0,
        data: { trigger: 'low_offers', metrics }
      });
      corrections.push(`Low offers (${metrics.offersSubmitted}/${targets.offersSubmitted}) → Mapondera estate strategy review`);
    }

    return corrections;
  }

  async createTasks(metrics) {
    const tasks = [];

    // Daily property comps health check
    await orchestrator.dispatch({
      task_uuid: uuidv4(), agent: 'sigma', task_type: 'lead_analysis',
      dispatched_by: 'property-engine', user_id: 0, user_name: 'Engine', chat_id: 0,
      data: { engine: 'property', metrics }
    });
    tasks.push('sigma:lead_analysis');

    // Daily revenue summary
    await orchestrator.dispatch({
      task_uuid: uuidv4(), agent: 'sentinel', task_type: 'system_health',
      dispatched_by: 'property-engine', user_id: 0, user_name: 'Engine', chat_id: 0,
      data: { engine: 'property' }
    });
    tasks.push('sentinel:system_health');

    return tasks;
  }

  async _runCompsRefresh() {
    // Pull active property leads and refresh comps for any with postcodes
    const result = await query(
      `SELECT id, lead_id, metadata FROM pipeline_entries
       WHERE engine = 'property' AND stage = 'new'
       AND metadata->>'postcode' IS NOT NULL
       LIMIT 10`
    );

    for (const entry of result.rows) {
      const postcode = entry.metadata?.postcode;
      if (!postcode) continue;
      try {
        const analysis = await propertyComps.fullAnalysis(postcode);
        await query(
          `UPDATE pipeline_entries SET metadata = metadata || $1::jsonb WHERE id = $2`,
          [JSON.stringify({ comps: analysis }), entry.id]
        );
      } catch (err) {
        console.warn(`[PROPERTY ENGINE] Comps refresh failed for ${postcode}:`, err.message);
      }
    }
  }
}

module.exports = new PropertyEngine();
