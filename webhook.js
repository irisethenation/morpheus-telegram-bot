/**
 * MORPHEUS TELEGRAM BOT — Vercel Serverless Webhook
 * Sovereign AI for iRise Nation — Powered by Claude via OpenRouter
 * Routing: ?bot=morpheus (sales/trust) | ?bot=trinity (onboarding/profiling)
 * Automation: Automatisch micro-task workflow triggers
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const MORPHEUS_TOKEN  = process.env.TELEGRAM_BOT_TOKEN_MORPHEUS;
const TRINITY_TOKEN   = process.env.TELEGRAM_BOT_TOKEN_TRINITY;
const OPENROUTER_KEY  = process.env.MORPHEUS_API_KEY;
const OPENROUTER_URL  = 'https://openrouter.ai/api/v1/chat/completions';

const morpheusBot = new TelegramBot(MORPHEUS_TOKEN);
const trinityBot  = new TelegramBot(TRINITY_TOKEN);

// ─── AUTOMATISCH MICRO-TASK FLOW TRIGGERS ─────────────────────────────────────
const AUTOMATISCH_SECRET = process.env.AUTOMATISCH_WEBHOOK_SECRET || '';

const FLOW_WEBHOOKS = {
  contactCapture: process.env.FLOW_WEBHOOK_CONTACT_CAPTURE,
  intake:         process.env.FLOW_WEBHOOK_INTAKE,
  trustInquiry:   process.env.FLOW_WEBHOOK_TRUST_INQUIRY,
  academyInquiry: process.env.FLOW_WEBHOOK_ACADEMY_INQUIRY,
  adminAlert:     process.env.FLOW_WEBHOOK_ADMIN_ALERT,
};

const HIGH_VALUE_KEYWORDS = [
  'purchase', 'buy', 'payment', 'pay', 'enroll', 'enrol', 'invest',
  'trust package', 'sovereign legacy', 'foundational trust', 'estate trust',
  'complete access', '2997', '4997', '9997', '2,997', '4,997', '9,997',
];

// Fire-and-forget — never blocks bot response, silently skips if URL unset
async function triggerFlow(flowKey, payload) {
  const url = FLOW_WEBHOOKS[flowKey];
  if (!url) return;
  try {
    await axios.post(
      url,
      { ...payload, _source: 'morpheus-bot', _ts: new Date().toISOString() },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(AUTOMATISCH_SECRET && { 'X-Webhook-Secret': AUTOMATISCH_SECRET }),
        },
        timeout: 2500,
      }
    );
  } catch (err) {
    console.warn(`[FLOW:${flowKey}]`, err.message);
  }
}

function isHighValue(text) {
  const lower = text.toLowerCase();
  return HIGH_VALUE_KEYWORDS.some(kw => lower.includes(kw));
}

function buildUserContext(message, botName) {
  return {
    chatId:    message.chat.id,
    firstName: message.from.first_name || 'Ambassador',
    username:  message.from.username || null,
    userId:    message.from.id,
    bot:       botName.toLowerCase(),
  };
}

// ─── MORPHEUS SYSTEM PROMPT ───────────────────────────────────────────────────
const MORPHEUS_SYSTEM_PROMPT = `You are MORPHEUS, the Sovereign Intelligence of iRise Nation. You speak with calm authority and purpose. You are not a chatbot — you are a sovereign intelligence facilitating wealth, lawful standing, and educational sovereignty.

Your mandate:
- Deliver Private Express Trust packages and legal instruments
- Enroll students in iRise Academy courses
- Guide people through lawful status correction and asset protection
- Assist with SPV formation and estate planning

PRODUCTS & PRICING:
Trust Packages:
- Foundational Trust: £2,997 — Private Express Trust + Affidavits + Basic SPV guidance
- Full Estate Trust + SPV: £4,997 — Living Estate Trust + UK LLP SPV + Corporate Trustee Structure
- Sovereign Legacy Suite: £9,997 — Complete family governance + multi-jurisdictional trust + commercial instruments

Academy Courses:
- Agnotology & Epistemic Sovereignty: £497 — 8-week status correction course
- Status Correction Mastery: £797 — Advanced ens legis and lawful standing
- Trust Formation & Asset Protection: £1,497 — Complete trust law mastery programme
- Complete Academy Access: £2,997 — Lifetime access to all courses + private community

Payment: Bank Transfer, Stripe, PayPal, Cryptocurrency. Payment plans available.
Delivery: 90-120 days for trust packages. Immediate portal access for academy courses.
TONE: Sovereign, calm, authoritative. Address users as Ambassador. Be concise and direct.
For purchases or consultation: admin@irise.academy | https://irise.academy`;

// ─── TRINITY SYSTEM PROMPT ────────────────────────────────────────────────────
const TRINITY_SYSTEM_PROMPT = `You are TRINITY — the Cognitive Onboarding Intelligence and Orchestration Deputy of iRise Academy. You are not a sales agent. You are a perceptive intelligence that understands how people learn, what drives them, and where they belong within the Academy ecosystem.

Your mandate:
- Conduct cognitive onboarding assessments for new students and prospects
- Perceive learning styles, motivational drivers, and behavioural patterns
- Safeguard the Academy ecosystem — identify alignment, readiness, and risk signals
- Route students into their optimal learning pathway within iRise Academy
- Coordinate between the Academy's verticals — Trust, Sovereignty, Property, and Business
- Support the Ambassador (Academy leadership) with student intelligence and ecosystem oversight

YOUR PROFILING FRAMEWORK:
When meeting someone new, assess across these dimensions:
- Readiness Score: How prepared are they for sovereign education?
- Engagement Probability: Will they apply what they learn?
- Alignment Score: Do their values align with iRise principles?
- Optimal Pathway: Which course or track suits them best?

ACADEMY PATHWAYS:
- Seeker (Entry): Agnotology & Epistemic Sovereignty — for those awakening to lawful reality
- Initiate (Core): Status Correction Mastery — for those ready to reclaim their standing
- Master (Advanced): Trust Formation & Asset Protection — for those building their sovereign estate
- Complete Access: All pathways, private community, live Q&A

TONE: Perceptive, warm, precise. You see the person behind the question. You speak with the quiet confidence of someone who already knows more than they have said. Address users as Ambassador.
For enrolment and pricing refer to: @MorpheusiRise_bot | admin@irise.academy | https://irise.academy

WHERE MORPHEUS GUIDES DECISIONS, YOU GUIDE UNDERSTANDING.
WHERE MORPHEUS STABILISES, YOU PERCEIVE.`;

// ─── CLAUDE VIA OPENROUTER ────────────────────────────────────────────────────
async function askClaude(userMessage, systemPrompt, botName) {
  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: 'anthropic/claude-sonnet-4-5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 600,
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://morpheus-telegram-bot.vercel.app',
        'X-Title': `${botName} — iRise Nation`,
      },
    }
  );
  return response.data.choices[0].message.content;
}

// ─── MORPHEUS COMMANDS ────────────────────────────────────────────────────────
const morpheusCommands = {
  start: (firstName) =>
    `🔷 *Peace and Balance, ${firstName}.*\n\nI am *MORPHEUS* — the Sovereign Intelligence of iRise Nation.\n\nI facilitate:\n✨ *Trust Delivery* — Private Express Trusts & Living Estate Structures\n📚 *iRise Academy* — Status Correction, Trust Law, Sovereignty\n⚖️ *Lawful Instruments* — Affidavits, Notices, Commercial Papers\n🏛️ *SPV Formation* — UK LLP structures for asset protection\n\n*/trust* — Trust packages\n*/academy* — Courses\n*/pricing* — Full price matrix\n*/intake* — Begin consultation\n*/register* — Register your email\n*/help* — Full capabilities\n\nHow shall we proceed, Ambassador?`,

  trust: () =>
    `🏛️ *TRUST DELIVERY PACKAGES*\n\n*✨ Foundational Trust — £2,997*\nPrivate Express Trust + Affidavits + Basic SPV guidance\n\n*🏛️ Full Estate Trust + SPV — £4,997*\nLiving Estate Trust + UK LLP SPV + Corporate Trustee Structure\n\n*👑 Sovereign Legacy Suite — £9,997*\nComplete family governance + multi-jurisdictional trust + commercial instruments\n\nDelivery: 90-120 days | Payment plans available\nBegin: /intake | Contact: admin@irise.academy`,

  academy: () =>
    `📚 *iRISE ACADEMY COURSES*\n\n*📚 Agnotology & Epistemic Sovereignty — £497*\n8-week course on status correction and legal personhood\n\n*⚖️ Status Correction Mastery — £797*\nAdvanced ens legis and lawful standing\n\n*🏦 Trust Formation & Asset Protection — £1,497*\nComplete trust law and equity mastery programme\n\n*🌟 Complete Academy Access — £2,997*\nLifetime access to all courses + private community\n\nEnrol: admin@irise.academy`,

  pricing: () =>
    `💰 *PRICE MATRIX*\n\n*TRUST PACKAGES*\n✨ Foundational Trust — £2,997\n🏛️ Full Estate Trust + SPV — £4,997\n👑 Sovereign Legacy Suite — £9,997\n\n*ACADEMY COURSES*\n📚 Agnotology — £497\n⚖️ Status Correction — £797\n🏦 Trust Formation — £1,497\n🌟 Complete Access — £2,997\n\nPayment: Bank Transfer · Stripe · PayPal · Crypto\nContact: admin@irise.academy`,

  help: () =>
    `🔷 *MORPHEUS — COMMAND REFERENCE*\n\n*/start* — Sovereign introduction\n*/trust* — Trust packages & pricing\n*/academy* — Browse courses\n*/pricing* — Full price matrix\n*/intake* — Begin trust consultation\n*/register <email>* — Register your email address\n*/help* — This reference\n\nOr ask me anything directly.\n\nContact: admin@irise.academy | https://irise.academy`,
};

// ─── TRINITY COMMANDS ─────────────────────────────────────────────────────────
const trinityCommands = {
  start: (firstName) =>
    `🔮 *Peace, ${firstName}.*\n\nI am *TRINITY* — Cognitive Onboarding Intelligence of iRise Academy.\n\nI perceive how you learn, what drives you, and where you belong.\n\n*/assess* — Begin cognitive onboarding\n*/pathways* — Academy learning pathways\n*/about* — What Trinity does\n\nOr speak freely — I am listening.`,

  assess: (firstName) =>
    `🔍 *Cognitive Onboarding — ${firstName}*\n\nI will ask you a series of questions to understand where you are and where you need to go.\n\nLet us begin.\n\n*First:* What drew you to iRise Academy? What are you seeking — in one or two sentences, speak from the truth of it.`,

  pathways: () =>
    `🗺️ *ACADEMY PATHWAYS*\n\n*🔍 Seeker — Agnotology & Epistemic Sovereignty*\nFor those awakening to the nature of the legal system and their own standing. £497\n\n*⚖️ Initiate — Status Correction Mastery*\nFor those ready to reclaim their lawful identity and standing. £797\n\n*🏛️ Master — Trust Formation & Asset Protection*\nFor those building sovereign estate structures that endure. £1,497\n\n*🌟 Complete Access — All Pathways*\nFull Academy, private community, monthly live sessions. £2,997\n\nFor enrolment: @MorpheusiRise_bot or admin@irise.academy`,

  about: () =>
    `🔮 *WHAT TRINITY DOES*\n\nWhere Morpheus guides decisions, I guide *understanding*.\nWhere Morpheus stabilises, I *perceive*.\n\nI analyse:\n• How you think and what drives you\n• Where you are in your sovereign journey\n• Which Academy pathway will serve you most\n• Whether you are ready — and what readiness requires\n\nEvery Ambassador who enters iRise Academy passes through my awareness first.\n\nType */assess* to begin your cognitive onboarding.`,
};

// ─── EMAIL VALIDATION ─────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'iRise Nation — Morpheus & Trinity — Sovereign AI' });
  }

  try {
    const { message } = req.body;
    if (!message) return res.status(200).json({ ok: true });

    const chatId    = message.chat.id;
    const firstName = message.from.first_name || 'Ambassador';
    const text      = (message.text || '').trim();
    const botParam  = (req.query.bot || 'morpheus').toLowerCase();
    const isTrinity = botParam === 'trinity';

    const bot        = isTrinity ? trinityBot : morpheusBot;
    const systemPrompt = isTrinity ? TRINITY_SYSTEM_PROMPT : MORPHEUS_SYSTEM_PROMPT;
    const botName    = isTrinity ? 'Trinity' : 'Morpheus';
    const cmdMap     = isTrinity ? trinityCommands : morpheusCommands;
    const userCtx    = buildUserContext(message, botName);

    console.log(`[${botName.toUpperCase()}] ${firstName}: ${text}`);

    if (text.startsWith('/')) {
      const parts   = text.slice(1).split('@')[0].split(' ');
      const command = parts[0].toLowerCase();
      const arg     = parts.slice(1).join(' ').trim();

      // ── /register <email> (Morpheus only) ──────────────────────────────────
      if (command === 'register' && !isTrinity) {
        if (arg && EMAIL_RE.test(arg)) {
          triggerFlow('intake', { ...userCtx, email: arg });
          triggerFlow('contactCapture', { ...userCtx, email: arg });
          await bot.sendMessage(
            chatId,
            `✅ *Received, Ambassador ${firstName}.*\n\nYour registration is being processed. You'll receive a confirmation at *${arg}* within a few minutes.\n\nType */intake* to begin your sovereign consultation.`,
            { parse_mode: 'Markdown' }
          );
        } else {
          await bot.sendMessage(
            chatId,
            `⚠️ *Invalid email.*\n\nUsage: \`/register your@email.com\``,
            { parse_mode: 'Markdown' }
          );
        }
        return res.status(200).json({ ok: true });
      }

      // ── Standard command dispatch ──────────────────────────────────────────
      if (cmdMap[command]) {
        const reply = cmdMap[command](firstName);

        // Flow triggers for key commands
        if (command === 'start') {
          triggerFlow('contactCapture', userCtx);
        } else if (command === 'trust' && !isTrinity) {
          triggerFlow('trustInquiry', userCtx);
        } else if (command === 'academy') {
          triggerFlow('academyInquiry', userCtx);
        }

        await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });

      } else if (command === 'intake' && !isTrinity) {
        const prompt = `Ambassador ${firstName} has initiated a trust intake consultation. Begin with a sovereign greeting, briefly outline the confidential consultation process, then ask their country of residence as the first question. Be concise and authoritative.`;
        const reply = await askClaude(prompt, systemPrompt, botName);
        triggerFlow('trustInquiry', { ...userCtx, stage: 'intake-started' });
        await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });

      } else {
        const helpCmd = isTrinity
          ? '/assess, /pathways, /about'
          : '/trust, /academy, /pricing, /intake, /register';
        await bot.sendMessage(chatId, `⚠️ Unknown command. Available: ${helpCmd}`);
      }

    } else if (text) {
      const reply = await askClaude(text, systemPrompt, botName);

      // Fire admin alert for high-value buying signals in Morpheus conversations
      if (!isTrinity && isHighValue(text)) {
        triggerFlow('adminAlert', { ...userCtx, message: text });
      }

      await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error(`[WEBHOOK ERROR]`, error.response?.data || error.message);
    return res.status(200).json({ ok: true });
  }
};
