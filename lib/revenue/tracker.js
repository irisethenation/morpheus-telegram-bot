// 5-day £15k campaign tracker — in-memory (upgrade to Vercel KV for persistence)
const GOAL = 15000;

const state = {
  startDate: null,
  revenue: { property: 0, websites: 0, irise: 0 },
  pipeline: { buyers: [], deals: [], websiteClients: [] },
  daily: {
    investorMessages: 0, buyersQualified: 0,
    dealsReviewed: 0, dealsPushed: 0,
    businessOutreach: 0, websiteCloses: 0
  }
};

const init = () => { if (!state.startDate) state.startDate = new Date().toISOString(); };

const addRevenue = (amount, type = 'property') => {
  if (!state.revenue[type]) state.revenue[type] = 0;
  state.revenue[type] += amount;
};

const getTotal = () => Object.values(state.revenue).reduce((a, b) => a + b, 0);

const getDayNumber = () => {
  if (!state.startDate) return 1;
  const diff = Date.now() - new Date(state.startDate).getTime();
  return Math.min(5, Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24))));
};

const getStatus = () => {
  const total = getTotal();
  const remaining = Math.max(0, GOAL - total);
  const pct = Math.min(100, (total / GOAL) * 100).toFixed(1);
  return {
    day: getDayNumber(), goal: GOAL, total, remaining, pct,
    breakdown: { ...state.revenue },
    pipeline: state.pipeline,
    daily: state.daily
  };
};

module.exports = { init, addRevenue, getStatus, getDayNumber, state };
