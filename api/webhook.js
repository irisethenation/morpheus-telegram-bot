const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { validate, generatePack, INFO } = require('./revenue/property');
const { PRICING, NICHES, previewUrl, buildOffer } = require('./revenue/websites');
const { get: getPayment } = require('./revenue/payments');
const { SCRIPTS } = require('./revenue/outreach');
const { init, addRevenue, getStatus, state } = require('./revenue/tracker');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN_MORPHEUS;
const MORPHEUS_URL = process.env.MORPHEUS_API_URL || 'http://51.79.29.15:19000';
const MORPHEUS_KEY = process.env.MORPHEUS_API_KEY;

const bot = new TelegramBot(TOKEN);
init();

// Per-user session state (deal pack / buyer qualification flows)
const sessions = {};

const md = (chatId, text, extra = {}) =>
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...extra });

// ─── OVH API HELPERS ─────────────────────────────────────────────────────────

const morpheusHeaders = () => ({ 'X-API-Key': MORPHEUS_KEY, 'Content-Type': 'application/json' });

const askMorpheus = async (message, sessionId) => {
  const res = await axios.post(
    `${MORPHEUS_URL}/api/morpheus/message`,
    { message, session_id: String(sessionId) },
    { headers: morpheusHeaders(), timeout: 30000 }
  );
  return res.data?.response || res.data?.message || JSON.stringify(res.data);
};

const runSkill = async (name, payload) => {
  const res = await axios.post(
    `${MORPHEUS_URL}/skills/run`,
    { name, payload },
    { headers: morpheusHeaders(), timeout: 20000 }
  );
  return res.data;
};

const getSkills = async () => {
  const res = await axios.get(`${MORPHEUS_URL}/skills`, { headers: morpheusHeaders(), timeout: 10000 });
  return res.data;
};

const getHealth = async () => {
  const res = await axios.get(`${MORPHEUS_URL}/health`, { timeout: 8000 });
  return res.data;
};

// ─── COMMAND HANDLERS ────────────────────────────────────────────────────────

const cmd = {

  start: async (chatId, firstName) => md(chatId, `
🔷 *Peace and Balance, ${firstName}.*

I am *MORPHEUS* — Sovereign Intelligence of iRise Nation, running on OVH.

*REVENUE COMMANDS:*
/property — US/UK property pipeline
/wepaycash — Seller landing page
/dealpack — Generate deal pack
/buyer — Qualify an investor
/websites — AI website sales
/preview [name] — Business preview URL
/outreach — Copy-ready scripts
/revenue — Campaign tracker

*iRISE COMMANDS:*
/trust — Trust packages
/academy — Courses
/pricing — All prices
/intake — Trust consultation

*PAYMENTS:*
/pay\\_uk — Tide (UK)
/pay\\_us — Mercury (US)

*SYSTEM:*
/agents — List all OVH skills/agents
/health — OVH server status
/tasks — Pending agent tasks
/help — Full reference`),

  // ── SYSTEM STATUS ───────────────────────────────────────────────────────────

  health: async (chatId) => {
    try {
      await md(chatId, '🔄 Checking OVH server...');
      const h = await getHealth();
      await md(chatId, `✅ *MORPHEUS — HEALTHY*\n\nServer: \`51.79.29.15\`\nStatus: ${JSON.stringify(h).slice(0, 300)}`);
    } catch (e) {
      await md(chatId, `⚠️ *OVH API unreachable*\n\`${e.message}\`\n\nCheck: \`docker ps\` on server`);
    }
  },

  agents: async (chatId) => {
    try {
      await md(chatId, '🔄 Fetching agent skills from OVH...');
      const skills = await getSkills();
      const list = Array.isArray(skills)
        ? skills.map((s, i) => `${i + 1}. \`${s.name || s}\`${s.description ? ` — ${s.description}` : ''}`).join('\n')
        : JSON.stringify(skills).slice(0, 2000);
      await md(chatId, `🤖 *MORPHEUS SKILLS (OVH — 51.79.29.15)*\n\n${list}\n\nRun a skill: /run [skill\\_name]`);
    } catch (e) {
      await md(chatId, `⚠️ Could not fetch skills: \`${e.message}\``);
    }
  },

  tasks: async (chatId) => {
    try {
      await md(chatId, '🔄 Querying pending tasks...');
      const result = await runSkill('db.query', {
        sql: "SELECT id, title, status, assigned_to, created_at FROM tasks WHERE status != 'done' ORDER BY created_at DESC LIMIT 20"
      });
      const rows = result?.result || result?.rows || result;
      if (!rows || !rows.length) {
        await md(chatId, '✅ No pending tasks found in OVH database.');
        return;
      }
      const formatted = rows.map(r =>
        `• *${r.title || r.id}* — \`${r.status}\`${r.assigned_to ? ` → ${r.assigned_to}` : ''}`
      ).join('\n');
      await md(chatId, `📋 *PENDING AGENT TASKS (OVH)*\n\n${formatted}`);
    } catch (e) {
      await md(chatId, `⚠️ Task query failed: \`${e.message}\``);
    }
  },

  run: async (chatId, args) => {
    if (!args) { await md(chatId, '⚠️ Usage: /run skill\\.name'); return; }
    const [skillName, ...rest] = args.split(' ');
    const payload = rest.length ? (() => { try { return JSON.parse(rest.join(' ')); } catch { return {}; } })() : {};
    try {
      await md(chatId, `🔄 Running skill \`${skillName}\`...`);
      const result = await runSkill(skillName, payload);
      await md(chatId, `✅ *${skillName}*\n\`\`\`\n${JSON.stringify(result, null, 2).slice(0, 3000)}\n\`\`\``);
    } catch (e) {
      await md(chatId, `⚠️ Skill failed: \`${e.message}\``);
    }
  },

  // ── PROPERTY ────────────────────────────────────────────────────────────────

  property: async (chatId) => md(chatId, `
🏠 *PROPERTY REVENUE STREAMS*

*${INFO.us.title}*
Site: ${INFO.us.site}
Fee: ${INFO.us.fee} | Timeline: ${INFO.us.timeline}

*${INFO.uk.title}*
Fee: ${INFO.uk.fee} | Timeline: ${INFO.uk.timeline}

/dealpack — Generate deal pack
/buyer — Qualify a buyer
/wepaycash — Seller site info
/pay\\_uk or /pay\\_us — Payment details
/outreach — Scripts`),

  wepaycash: async (chatId) => md(chatId, `
🏡 *WE PAY CASH 4 YOUR HOUSE*
wepaycash4yourhouse.com

*🇺🇸 US Sellers:*
• Cash offer, any condition
• Close in 5–14 days
• No agents, no fees, no repairs

*🇬🇧 UK Sellers:*
• Discreet off-market sale
• Completion in 14–28 days

*Wholesalers / Agents — submit deals:*
Must show 20%+ below market value.

/dealpack — Submit a deal
/buyer — Register as buyer`),

  dealpack: async (chatId, userId) => {
    sessions[userId] = { stage: 'dp_location', data: {} };
    await md(chatId, `📋 *DEAL PACK GENERATOR — Step 1/6*\n\nWhat city/area is the property?\n_(e.g. Birmingham UK or Atlanta GA)_`);
  },

  buyer: async (chatId, userId, firstName) => {
    sessions[userId] = { stage: 'bq_region', data: { name: firstName } };
    state.daily.investorMessages++;
    await md(chatId, `🎯 *BUYER QUALIFICATION — ${firstName}*\n\nWhat region are you buying in?\nReply: *UK / US / Both*`);
  },

  // ── WEBSITES ────────────────────────────────────────────────────────────────

  websites: async (chatId) => md(chatId, `
🌐 *AI WEBSITE SALES — GEM THE AGENCY*
gemtheagency.com

*We build personalised AI websites for local businesses.*
Preview → 48hr activation → leads from day 1.

*PRICING:*
✅ Activation: £${PRICING.activation.min}–£${PRICING.activation.max}
✅ Lead Automation: £${PRICING.automation.min}–£${PRICING.automation.max}
✅ CRM Integration: £${PRICING.crm.min}–£${PRICING.crm.max}
✅ Full Bundle: £${PRICING.bundle.min}–£${PRICING.bundle.max}

*Target niches:* ${NICHES.slice(0, 6).join(', ')}

/preview [business name] — Generate preview link
/outreach — Website outreach scripts
/pay\\_uk — Take payment`),

  preview: async (chatId, args) => {
    if (!args?.trim()) { await md(chatId, '⚠️ Usage: /preview Smiths Plumbing London'); return; }
    const name = args.trim();
    const offer = buildOffer(name);
    state.daily.businessOutreach++;
    await md(chatId, `
🌐 *PREVIEW GENERATED — ${name}*

URL: ${offer.previewUrl}

*Copy this outreach message:*
---
Quick one — we've already built a working version of ${name}'s website.

View it here: ${offer.previewUrl}

We can activate it within 48 hours and connect it to lead capture.

Reply if you want it live.
---

Activation: ${offer.activation}
+ Automation: ${offer.automation}
Bundle: ${offer.bundle}

/pay\\_uk — to take payment`);
  },

  // ── OUTREACH SCRIPTS ────────────────────────────────────────────────────────

  outreach: async (chatId, userId) => {
    sessions[userId] = { stage: 'outreach_pick', data: {} };
    await md(chatId, `📣 *OUTREACH SCRIPTS*\n\nReply with number:\n\n1️⃣ Investor activation blast\n2️⃣ Deal sourcing (agents/wholesalers)\n3️⃣ Website outreach (business)\n4️⃣ Website follow-up\n5️⃣ Website close (urgency)\n6️⃣ JV offer\n7️⃣ Buyer push (with deal details)`);
  },

  // ── REVENUE TRACKER ─────────────────────────────────────────────────────────

  revenue: async (chatId) => {
    const s = getStatus();
    const filled = Math.floor(s.pct / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    await md(chatId, `
📊 *REVENUE CAMPAIGN — DAY ${s.day}/5*

*TARGET: £15,000*
[${bar}] ${s.pct}%

💰 Total: £${s.total.toLocaleString()}
🏠 Property: £${(s.breakdown.property || 0).toLocaleString()}
🌐 Websites: £${(s.breakdown.websites || 0).toLocaleString()}
✨ iRise: £${(s.breakdown.irise || 0).toLocaleString()}
📌 Remaining: £${s.remaining.toLocaleString()}

*TODAY:*
📨 Investor messages: ${s.daily.investorMessages}
✅ Buyers qualified: ${s.daily.buyersQualified}
🏠 Deals reviewed: ${s.daily.dealsReviewed}
📤 Deals pushed: ${s.daily.dealsPushed}
📧 Business outreach: ${s.daily.businessOutreach}
🤝 Website closes: ${s.daily.websiteCloses}

*Pipeline:*
👥 Buyers: ${s.pipeline.buyers.length}
🏠 Active Deals: ${s.pipeline.deals.length}
🌐 Website Clients: ${s.pipeline.websiteClients.length}

/log\\_revenue [amount] [property/websites/irise]`);
  },

  log_revenue: async (chatId, args) => {
    if (!args) { await md(chatId, '⚠️ Usage: /log\\_revenue 500 websites'); return; }
    const [amtStr, type = 'property'] = args.split(' ');
    const amount = parseFloat(amtStr);
    if (isNaN(amount)) { await md(chatId, '⚠️ Invalid amount.'); return; }
    addRevenue(amount, type);
    const s = getStatus();
    await md(chatId, `✅ *Logged: £${amount.toLocaleString()} (${type})*\n\nTotal: £${s.total.toLocaleString()} / £${s.goal.toLocaleString()} (${s.pct}%)`);
  },

  // ── PAYMENTS ────────────────────────────────────────────────────────────────

  pay_uk: async (chatId) => {
    const p = getPayment('uk');
    await md(chatId, `🇬🇧 *UK PAYMENT DETAILS*\n\nEntity: *${p.entity}*\nBank: *${p.bank}*\n\n${p.reference}\n\n✅ Send proof of payment to confirm.\n\n_${p.note}_`);
  },

  pay_us: async (chatId) => {
    const p = getPayment('us');
    await md(chatId, `🇺🇸 *US PAYMENT DETAILS*\n\nEntity: *${p.entity}*\nBank: *${p.bank}*\n\n${p.reference}\n\n✅ Send proof of payment to confirm.\n\n_${p.note}_`);
  },

  // ── iRISE SERVICES ──────────────────────────────────────────────────────────

  trust: async (chatId) => md(chatId, `
🏛️ *TRUST DELIVERY PACKAGES*

*✨ Foundational Trust* — £2,997
Private Express Trust + Affidavits + Basic SPV guidance

*🏛️ Full Estate Trust + SPV* — £4,997
Living Estate Trust + UK LLP SPV + Corporate Trustee Structure

*👑 Sovereign Legacy Suite* — £9,997
Complete family governance + multi-jurisdictional trust + commercial instruments

Delivery: 90–120 days | Payment plans available

/intake — Begin consultation
/pay\\_uk — Payment details`),

  academy: async (chatId) => md(chatId, `
📚 *iRISE ACADEMY COURSES*

*📚 Agnotology & Epistemic Sovereignty* — £497
8-week course on status correction and legal personhood

*⚖️ Status Correction Mastery* — £797
Advanced course on ens legis and lawful standing

*🏦 Trust Formation & Asset Protection* — £1,497
Complete trust law and equity mastery programme

*🌟 Complete Academy Access* — £2,997
Lifetime access to all courses + private community

All courses: lifetime access + monthly Q&A + certificate
Reply with course name to enroll`),

  pricing: async (chatId) => md(chatId, `
💰 *COMPLETE PRICE MATRIX*

*TRUST PACKAGES:*
✨ Foundational Trust — £2,997
🏛️ Full Estate + SPV — £4,997
👑 Sovereign Legacy Suite — £9,997

*ACADEMY:*
📚 Agnotology — £497
⚖️ Status Correction — £797
🏦 Trust Formation — £1,497
🌟 Full Access — £2,997

*WEBSITE SERVICES (gemtheagency.com):*
Activation — £${PRICING.activation.min}–£${PRICING.activation.max}
Lead Automation — £${PRICING.automation.min}–£${PRICING.automation.max}
CRM Integration — £${PRICING.crm.min}–£${PRICING.crm.max}
Full Bundle — £${PRICING.bundle.min}–£${PRICING.bundle.max}

🇬🇧 /pay\\_uk — Tide | 🇺🇸 /pay\\_us — Mercury`),

  intake: async (chatId, userId, firstName) => {
    sessions[userId] = { stage: 'intake_jurisdiction', data: { name: firstName } };
    await md(chatId, `
🔷 *Trust Intake — ${firstName}*

Covers: Identity · Assets · Governance · Beneficiaries · SPV
Protected under NDA Level 3 · GDPR compliant

*Question 1:* What is your current country of residence?`);
  },

  help: async (chatId) => md(chatId, `
🔷 *MORPHEUS — FULL REFERENCE*
OVH: \`51.79.29.15:19000\`

*REVENUE:*
/property · /wepaycash · /dealpack · /buyer
/websites · /preview [name] · /outreach
/revenue · /log\\_revenue [amt] [type]

*PAYMENTS:*
/pay\\_uk (Tide) · /pay\\_us (Mercury)

*iRISE:*
/trust · /academy · /pricing · /intake

*SYSTEM (OVH agents):*
/agents — All 69 skills
/health — Server status
/tasks — Pending tasks
/run [skill] — Execute skill

*AI:* Free-form messages route to Morpheus AI (OVH)`)
};

// ─── SESSION FLOW HANDLER ────────────────────────────────────────────────────

const handleSession = async (chatId, userId, text) => {
  const session = sessions[userId];
  if (!session) return false;
  const { stage, data } = session;
  const num = parseFloat(text.replace(/[^0-9.]/g, ''));

  // Outreach script selection
  if (stage === 'outreach_pick') {
    delete sessions[userId];
    const map = {
      '1': SCRIPTS.investor_activation,
      '2': SCRIPTS.deal_sourcing,
      '3': SCRIPTS.website_outreach('[Business Name]', '[preview URL]'),
      '4': SCRIPTS.website_follow_up('[Business Name]'),
      '5': SCRIPTS.website_close,
      '6': SCRIPTS.jv_offer,
      '7': SCRIPTS.buyer_push('[Location]', 0, 0, 0)
    };
    const s = map[text.trim()];
    if (s) await md(chatId, `📋 *COPY & SEND:*\n\n---\n${s}\n---`);
    else await md(chatId, '⚠️ Reply 1–7. /outreach to see menu.');
    return true;
  }

  // Deal pack flow
  const dpStages = {
    dp_location: { next: 'dp_price', ask: '💰 *Step 2/6 — Purchase Price:*\nNumbers only (e.g. 85000)', save: 'location' },
    dp_price: { next: 'dp_arv', ask: '📊 *Step 3/6 — Market Value (ARV):*\nEstimated value after repair', save: 'price', parse: true },
    dp_arv: { next: 'dp_rehab', ask: '🔨 *Step 4/6 — Rehab Cost:*\nEst. renovation cost (0 if none)', save: 'arv', parse: true },
    dp_rehab: { next: 'dp_exit', ask: '🚪 *Step 5/6 — Exit Strategy:*\nReply: assign / flip / rental', save: 'rehab', parse: true },
    dp_exit: { next: 'dp_region', ask: '🌍 *Step 6/6 — Region:*\nReply: UK or US', save: 'exit' }
  };

  if (dpStages[stage]) {
    const s = dpStages[stage];
    data[s.save] = s.parse ? (isNaN(num) ? 0 : num) : text.trim();
    sessions[userId].stage = s.next;
    await md(chatId, s.ask);
    return true;
  }

  if (stage === 'dp_region') {
    data.region = text.toLowerCase().includes('us') ? 'us' : 'uk';
    data.exit = data.exit || 'assign';
    delete sessions[userId];
    const v = validate(data);
    const pack = generatePack(data);
    state.daily.dealsReviewed++;
    const badge = v.valid ? `✅ *APPROVED — ${v.discount}% below market*` : `⚠️ *FLAGGED — ${v.discount}% below market (need 20%+)*`;
    await md(chatId, `${badge}\n\n${pack}\n\n---\n/outreach — script #7 to push to buyers\n/pay_${data.region} — payment details`);
    if (v.valid) state.pipeline.deals.push({ ...data, ts: new Date().toISOString() });
    return true;
  }

  // Buyer qualification flow
  const bqMap = {
    bq_region: { next: 'bq_budget', ask: '💰 *Budget range?*\ne.g. £50k–£150k or $100k–$300k', save: 'region' },
    bq_budget: { next: 'bq_roi', ask: '📈 *Minimum ROI target?*\ne.g. 25%', save: 'budget' },
    bq_roi: { next: 'bq_pof', ask: '📄 *Proof of funds:*\nBank statement or screenshot available?', save: 'roi' },
    bq_pof: { next: 'bq_timeline', ask: '⏱ *Close timeline?*\nHow fast can you move once deal confirmed?', save: 'pof' }
  };

  if (bqMap[stage]) {
    const s = bqMap[stage];
    data[s.save] = text.trim();
    sessions[userId].stage = s.next;
    await md(chatId, s.ask);
    return true;
  }

  if (stage === 'bq_timeline') {
    data.timeline = text.trim();
    delete sessions[userId];
    state.daily.buyersQualified++;
    state.pipeline.buyers.push({ ...data, ts: new Date().toISOString() });
    await md(chatId, `✅ *BUYER QUALIFIED — ${data.name}*\n\n• Region: ${data.region}\n• Budget: ${data.budget}\n• ROI Target: ${data.roi}\n• POF: ${data.pof}\n• Timeline: ${data.timeline}\n\nYou're on the priority deal list. I'll contact you when a match comes in.`);
    return true;
  }

  // Trust intake flow
  if (stage === 'intake_jurisdiction') {
    data.jurisdiction = text;
    sessions[userId].stage = 'intake_assets';
    await md(chatId, `📍 Noted: ${text}\n\n*Question 2:* Describe your current assets (property, business, savings, other)?`);
    return true;
  }
  if (stage === 'intake_assets') {
    data.assets = text;
    sessions[userId].stage = 'intake_purpose';
    await md(chatId, `✅ Noted.\n\n*Question 3:* Primary purpose of forming a trust?\n_(asset protection / estate planning / privacy / tax efficiency)_`);
    return true;
  }
  if (stage === 'intake_purpose') {
    data.purpose = text;
    delete sessions[userId];
    await md(chatId, `✅ *Initial Consultation Complete*\n\n• Jurisdiction: ${data.jurisdiction}\n• Assets: ${data.assets}\n• Purpose: ${data.purpose}\n\nA trust advisor will contact you within 24 hours.\n\n/trust — View packages\n/pay_uk — Payment details`);
    return true;
  }

  return false;
};

// ─── MAIN WEBHOOK ─────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).json({ status: 'Morpheus OVH webhook active', api: MORPHEUS_URL });

  try {
    const { message } = req.body;
    if (!message) return res.status(200).json({ ok: true });

    const chatId = message.chat.id;
    const userId = message.from.id;
    const firstName = message.from.first_name || 'Ambassador';
    const text = (message.text || '').trim();

    console.log(`[MSG] ${userId} (${firstName}): ${text.slice(0, 100)}`);

    if (text.startsWith('/')) {
      const [rawCmd, ...argParts] = text.slice(1).split(' ');
      const c = rawCmd.toLowerCase().split('@')[0];
      const args = argParts.join(' ');

      const directCmds = {
        start: () => cmd.start(chatId, firstName),
        health: () => cmd.health(chatId),
        agents: () => cmd.agents(chatId),
        tasks: () => cmd.tasks(chatId),
        run: () => cmd.run(chatId, args),
        property: () => cmd.property(chatId),
        deals: () => cmd.property(chatId),
        wepaycash: () => cmd.wepaycash(chatId),
        dealpack: () => cmd.dealpack(chatId, userId),
        buyer: () => cmd.buyer(chatId, userId, firstName),
        qualify: () => cmd.buyer(chatId, userId, firstName),
        websites: () => cmd.websites(chatId),
        agency: () => cmd.websites(chatId),
        preview: () => cmd.preview(chatId, args),
        outreach: () => cmd.outreach(chatId, userId),
        revenue: () => cmd.revenue(chatId),
        tracker: () => cmd.revenue(chatId),
        log_revenue: () => cmd.log_revenue(chatId, args),
        pay_uk: () => cmd.pay_uk(chatId),
        pay_us: () => cmd.pay_us(chatId),
        trust: () => cmd.trust(chatId),
        academy: () => cmd.academy(chatId),
        pricing: () => cmd.pricing(chatId),
        intake: () => cmd.intake(chatId, userId, firstName),
        help: () => cmd.help(chatId)
      };

      if (directCmds[c]) await directCmds[c]();
      else await md(chatId, `⚠️ Unknown command. /help for reference.`);

    } else {
      const inSession = await handleSession(chatId, userId, text);
      if (!inSession) {
        // Route to OVHCloud Morpheus AI
        try {
          await bot.sendChatAction(chatId, 'typing');
          const reply = await askMorpheus(text, userId);
          await md(chatId, reply);
        } catch (e) {
          console.error('[OVH API ERROR]', e.message);
          await md(chatId, `I'm having trouble reaching the OVH server.\n\n_Error: ${e.message.slice(0, 100)}_\n\nTry /health to check server status.`);
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[WEBHOOK ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
};
