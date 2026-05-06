'use strict';

const { query } = require('../services/db');

// Default KPI targets per engine
const DEFAULT_TARGETS = {
  agency: {
    callsBooked:       5,
    proposalsSent:     3,
    signedContracts:   1,
    replyRate:         0.15,
    conversionRate:    0.10,
    revenueGbp:        5000
  },
  property: {
    leadsGenerated:    20,
    offersSubmitted:   5,
    dealsUnderOffer:   2,
    completions:       1,
    revenueGbp:        10000
  },
  academy: {
    enrollments:       10,
    courseCompletions: 5,
    upsells:           2,
    revenueGbp:        8000
  },
  grant: {
    grantsIdentified:  10,
    applicationsSubmitted: 3,
    awardsReceived:    1,
    totalGrantValue:   25000
  }
};

async function snapshot(engine, metrics) {
  const targets = DEFAULT_TARGETS[engine] || {};
  const score   = computeScore(metrics, targets);

  const result = await query(
    `INSERT INTO kpi_snapshots (engine, snapshot_date, metrics, targets, score)
     VALUES ($1, CURRENT_DATE, $2, $3, $4)
     ON CONFLICT (engine, snapshot_date) DO UPDATE
       SET metrics = EXCLUDED.metrics,
           score   = EXCLUDED.score,
           targets = EXCLUDED.targets
     RETURNING *`,
    [engine, JSON.stringify(metrics), JSON.stringify(targets), score]
  );
  return result.rows[0];
}

async function addCorrections(engine, corrections) {
  await query(
    `UPDATE kpi_snapshots
     SET corrections = corrections || $1::jsonb
     WHERE engine = $2 AND snapshot_date = CURRENT_DATE`,
    [JSON.stringify(corrections), engine]
  );
}

async function getToday(engine) {
  const result = await query(
    `SELECT * FROM kpi_snapshots WHERE engine = $1 AND snapshot_date = CURRENT_DATE`,
    [engine]
  );
  return result.rows[0] || null;
}

async function getHistory(engine, days = 7) {
  const result = await query(
    `SELECT * FROM kpi_snapshots
     WHERE engine = $1 AND snapshot_date >= CURRENT_DATE - INTERVAL '${parseInt(days, 10)} days'
     ORDER BY snapshot_date DESC`,
    [engine]
  );
  return result.rows;
}

async function getAllHistory(days = 7) {
  const result = await query(
    `SELECT * FROM kpi_snapshots
     WHERE snapshot_date >= CURRENT_DATE - INTERVAL '${parseInt(days, 10)} days'
     ORDER BY engine, snapshot_date DESC`
  );
  return result.rows;
}

async function getTargets(engine) {
  return DEFAULT_TARGETS[engine] || {};
}

function computeScore(metrics, targets) {
  const keys = Object.keys(targets).filter((k) => typeof targets[k] === 'number' && targets[k] > 0);
  if (keys.length === 0) return 0;

  const ratios = keys.map((k) => {
    const actual = parseFloat(metrics[k]) || 0;
    return Math.min(actual / targets[k], 1.5); // cap at 150% to normalise
  });

  return parseFloat(((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100).toFixed(2));
}

module.exports = { snapshot, addCorrections, getToday, getHistory, getAllHistory, getTargets, computeScore, DEFAULT_TARGETS };
