'use strict';

const BaseAgent    = require('./base');
const orchestrator = require('./orchestrator');
const kpiStore     = require('../memory/kpiStore');
const assets       = require('../memory/winningAssets');
const eventBus     = require('../services/eventBus');
const { CHANNELS } = require('../services/eventBus');
const { query }    = require('../services/db');
const llm          = require('../services/llmRouter');

// Sovereign agent army
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
      `You are Morpheus, the sovereign master intelligence of iRise Nation.
You orchestrate: Trinity, Phoenix, Creator, Sentinel, Sigma, Kappa, Mapondera.
All agents run on OVH sovereign infrastructure. No third-party AI services.
You have full visibility of KPIs, pipeline performance, winning assets, and task history.
You detect underperformance, auto-correct, suggest new skills and workflows, and
compound intelligence from every outcome. Speak with authority and strategic depth.`,
      'advanced'
    );
  }

  async process(taskType, context) {
    switch (taskType) {
      case 'system_health':     return this._systemHealth();
      case 'kpi_review':        return this._kpiReview(context.data);
      case 'learn_and_suggest': return this._learnAndSuggest();
      case 'approve_suggestion':return this._approveSuggestion(context.data?.suggestionId);
      default:
        return this.ask([{
          role: 'user',
          content: `Orchestration task: ${taskType}\nContext: ${JSON.stringify(context)}`
        }]);
    }
  }

  // ─── System Health ─────────────────────────────────────────────────
  async _systemHealth() {
    const [kpiHistory, assetSummary, runHistory] = await Promise.all([
      kpiStore.getAllHistory(7),
      assets.summary(),
      query(`SELECT engine, status, COUNT(*) AS c FROM engine_runs
             WHERE started_at >= NOW() - INTERVAL '7 days'
             GROUP BY engine, status ORDER BY engine`)
    ]);

    const engineScores = {};
    for (const snap of kpiHistory) {
      if (!engineScores[snap.engine] || snap.snapshot_date > engineScores[snap.engine].date) {
        engineScores[snap.engine] = { score: snap.score, date: snap.snapshot_date };
      }
    }

    return { timestamp: new Date().toISOString(), engine_scores: engineScores, asset_summary: assetSummary, run_history: runHistory.rows, status: 'operational' };
  }

  // ─── KPI Review + Auto-Correct ─────────────────────────────────────
  async _kpiReview({ engine } = {}) {
    const engines = engine ? [engine] : ['agency', 'property', 'academy', 'grant'];
    const reviews = [];

    for (const eng of engines) {
      const history = await kpiStore.getHistory(eng, 7);
      const targets = await kpiStore.getTargets(eng);
      const today   = history[0];
      if (!today) continue;

      const underperforming = [];
      const performing      = [];

      for (const [kpi, target] of Object.entries(targets)) {
        const actual = today.metrics[kpi] ?? 0;
        if (actual < target) underperforming.push({ kpi, actual, target, gap: target - actual });
        else performing.push({ kpi, actual, target });
      }

      // Auto-correct when score < 60
      if (today.score < 60 && underperforming.length > 0) {
        await this._autoCorrectEngine(eng, underperforming, today.metrics);
      }

      reviews.push({ engine: eng, score: today.score, underperforming, performing });
    }

    await eventBus.publish(CHANNELS.SYSTEM_ALERT, { type: 'kpi_review_complete', reviews, timestamp: new Date().toISOString() });
    return { reviews };
  }

  async _autoCorrectEngine(engine, underperforming, metrics) {
    for (const { kpi, actual, target } of underperforming) {

      // callsBooked < target → increase outreach volume
      if (kpi === 'callsBooked' && actual < target) {
        console.log(`[MORPHEUS] Auto-correct: ${engine} callsBooked ${actual}/${target} → outreach boost`);
        await eventBus.publish(CHANNELS.SYSTEM_ALERT, { type: 'outreach_boost', engine, reason: `callsBooked ${actual}/${target}` });
      }

      // replyRate low → switch to best script
      if (kpi === 'replyRate' && actual < target) {
        const bestScript = await assets.getBest({ type: 'sms_template', engine, context: 'cold_outreach' });
        if (bestScript) console.log(`[MORPHEUS] Auto-correct: ${engine} replyRate → activating "${bestScript.name}"`);
      }

      // revenue low → activate best offer
      if (kpi === 'revenueGbp' && actual < target) {
        const bestOffer = await assets.getBest({ type: 'offer', engine });
        if (bestOffer) console.log(`[MORPHEUS] Auto-correct: ${engine} revenue → activating offer "${bestOffer.name}"`);
      }

      // enrollments low (academy) → trigger Kappa campaign
      if (kpi === 'enrollments' && actual < target) {
        const { v4: uuidv4 } = require('uuid');
        await orchestrator.dispatch({
          task_uuid: uuidv4(), agent: 'kappa', task_type: 'enrollment_start',
          dispatched_by: 'morpheus-kpi', user_id: 0, user_name: 'Morpheus', chat_id: 0,
          data: { trigger: 'auto_correct', kpi, actual, target }
        });
      }
    }
  }

  // ─── Learning Loop — compounds best practices ───────────────────────
  async _learnAndSuggest() {
    const [kpiHistory, topAssets, recentTasks, corrections] = await Promise.all([
      kpiStore.getAllHistory(30),
      assets.list({ limit: 20 }),
      query(`SELECT agent_name, task_type, status, COUNT(*) AS c FROM agent_tasks
             WHERE created_at >= NOW() - INTERVAL '7 days'
             GROUP BY agent_name, task_type, status ORDER BY agent_name, c DESC`),
      query(`SELECT engine, corrections FROM kpi_snapshots
             WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days' ORDER BY snapshot_date DESC`)
    ]);

    const evidence = {
      kpi_trends:          this._summariseKPITrends(kpiHistory),
      top_assets:          topAssets.slice(0, 10).map((a) => ({ name: a.name, type: a.type, success_rate: a.success_rate, uses: a.uses })),
      agent_activity:      recentTasks.rows,
      recent_corrections:  corrections.rows.flatMap((r) => r.corrections || [])
    };

    const suggestion = await llm.chat({
      system:    this.systemPrompt,
      tier:      'advanced',
      maxTokens: 2048,
      messages: [{
        role: 'user',
        content: `Analyse 30-day performance data and respond ONLY in valid JSON with these keys:
{
  "underperforming": [{"title": "", "description": ""}],
  "winning_patterns": [{"title": "", "description": ""}],
  "new_skills":       [{"title": "", "description": ""}],
  "new_asset_proposal": {"type": "script|offer|sms_template", "name": "", "context": "", "content": ""}
}

Data: ${JSON.stringify(evidence)}`
      }]
    });

    let parsed;
    try {
      const m = suggestion.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { raw: suggestion };
    } catch {
      parsed = { raw: suggestion };
    }

    const stored = await this._storeSuggestions(parsed, evidence);

    if (parsed.new_asset_proposal?.content) {
      await assets.create({
        type:     parsed.new_asset_proposal.type || 'script',
        name:     parsed.new_asset_proposal.name || 'Morpheus Proposed Asset',
        content:  parsed.new_asset_proposal.content,
        context:  parsed.new_asset_proposal.context || null,
        metadata: { proposed_by: 'morpheus' }
      });
    }

    await eventBus.publish(CHANNELS.SYSTEM_ALERT, { type: 'morpheus_suggestions', suggestions: stored, timestamp: new Date().toISOString() });
    return { suggestions: stored };
  }

  async _storeSuggestions(parsed, evidence) {
    const stored = [];
    const map = [
      { key: 'underperforming',  category: 'workflow', priority: 'high' },
      { key: 'winning_patterns', category: 'skill',    priority: 'medium' },
      { key: 'new_skills',       category: 'skill',    priority: 'medium' }
    ];

    for (const { key, category, priority } of map) {
      for (const item of (Array.isArray(parsed[key]) ? parsed[key] : []).slice(0, 3)) {
        const title       = (typeof item === 'string' ? item : item.title || '').slice(0, 255);
        const description = typeof item === 'object' ? (item.description || title) : title;
        const result = await query(
          `INSERT INTO morpheus_suggestions (category, title, description, priority, evidence)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [category, title, description, priority, JSON.stringify({ source_keys: Object.keys(evidence) })]
        );
        stored.push({ id: result.rows[0].id, category, title, priority });
      }
    }
    return stored;
  }

  async _approveSuggestion(suggestionId) {
    if (!suggestionId) return { error: 'suggestionId required' };
    await query(`UPDATE morpheus_suggestions SET status = 'accepted', reviewed_at = NOW() WHERE id = $1`, [suggestionId]);
    return { ok: true, suggestionId, status: 'accepted' };
  }

  _summariseKPITrends(history) {
    const byEngine = {};
    for (const snap of history) {
      if (!byEngine[snap.engine]) byEngine[snap.engine] = [];
      byEngine[snap.engine].push({ score: snap.score });
    }
    return Object.entries(byEngine).map(([engine, snaps]) => {
      const scores = snaps.map((s) => s.score).filter(Boolean);
      const avg    = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const trend  = scores.length >= 2 ? scores[0] - scores[scores.length - 1] : 0;
      return { engine, avg_score: parseFloat(avg.toFixed(2)), trend: parseFloat(trend.toFixed(2)) };
    });
  }
}

// ─── Boot ───────────────────────────────────────────────────────────────
function init() {
  const morpheus  = new MorpheusAgent();
  const trinity   = new Trinity();
  const phoenix   = new Phoenix();
  const creator   = new Creator();
  const sentinel  = new Sentinel();
  const sigma     = new Sigma();
  const kappa     = new Kappa();
  const mapondera = new Mapondera();

  orchestrator.register('morpheus',  morpheus);
  orchestrator.register('trinity',   trinity);
  orchestrator.register('phoenix',   phoenix);
  orchestrator.register('creator',   creator);
  orchestrator.register('sentinel',  sentinel);
  orchestrator.register('sigma',     sigma);
  orchestrator.register('kappa',     kappa);
  orchestrator.register('mapondera', mapondera);

  console.log('[MORPHEUS] All 8 agents registered — sovereign stack online');
  return morpheus;
}

module.exports = { MorpheusAgent, init };
