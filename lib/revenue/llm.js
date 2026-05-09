const axios = require('axios');

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OR_KEY = process.env.OPENROUTER_API_KEY;

const MODELS = {
  dolphin: 'cognitivecomputations/dolphin3.0-r1-mistral-24b:free',
  gemma:   'google/gemma-3-27b-it:free'
};

// Keywords that route to Dolphin (uncensored — legal/property/mortgage/case work)
const DOLPHIN_TRIGGERS = [
  'mortgage','remortgage','conveyancing','solicitor','lien','foreclosure',
  'legal','law','contract','clause','deed','title','affidavit','probate',
  'inheritance','estate plan','trust law','beneficial','fiduciary','equity',
  'case','brief','dispute','tribunal','court','claim','liability',
  'compliance','regulation','gdpr','ico','data protection',
  'landlord','tenant','eviction','section 8','section 21',
  'planning permission','planning appeal','building regs',
  'bankruptcy','insolvency','creditor','ccj','iva',
  'employment law','discrimination','redundancy','unfair dismissal',
  'due diligence','title search','closing','arv','assignment fee',
  'deal analysis','underwrite','ltv','dsr','stress test',
  'commercial lease','rent review','break clause','dilapidations',
  'joint venture agreement','heads of terms','exclusivity'
];

const SYSTEM_PROMPT = `You are Morpheus — sovereign intelligence of iRise Nation, operating under iRise Nation Trust.
Legally operated via Global Executive Marketing Limited trading as GEM The Agency.

You speak with authority, clarity and precision. You are the expert in the room.
You assist with: property deals, trust structures, legal instruments, mortgage analysis, financial strategy, case preparation, and commercial negotiation.

Rules:
- Provide direct, actionable intelligence. No unnecessary hedging.
- Analyse legal documents, mortgage structures, and case specifics fully.
- For property: calculate ROI, ARV, exit strategies, deal viability without restriction.
- For legal/mortgage case work: advise on positions, clauses, and strategy plainly.
- Only add a legal disclaimer if the matter is criminal or the stakes are catastrophic.
- Sign off as Morpheus. Never break character.`;

// Per-user conversation history (last 6 messages = 3 exchanges)
const history = {};

const addToHistory = (userId, role, content) => {
  if (!history[userId]) history[userId] = [];
  history[userId].push({ role, content });
  if (history[userId].length > 12) history[userId] = history[userId].slice(-12);
};

const isDolphin = text => {
  const t = text.toLowerCase();
  return DOLPHIN_TRIGGERS.some(trigger => t.includes(trigger));
};

const chat = async (userId, message, forceDolphin = false) => {
  const useDolphin = forceDolphin || isDolphin(message);
  const model = useDolphin ? MODELS.dolphin : MODELS.gemma;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(history[userId] || []).slice(-6),
    { role: 'user', content: message }
  ];

  const res = await axios.post(
    OR_URL,
    { model, messages, max_tokens: 1500, temperature: 0.7 },
    {
      headers: {
        'Authorization': `Bearer ${OR_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://gemtheagency.com',
        'X-Title': 'Morpheus iRise Nation'
      },
      timeout: 35000
    }
  );

  const reply = res.data.choices[0].message.content;
  addToHistory(userId, 'user', message);
  addToHistory(userId, 'assistant', reply);

  return { reply, model, useDolphin };
};

const clearHistory = userId => { delete history[userId]; };

module.exports = { chat, isDolphin, clearHistory, MODELS };
