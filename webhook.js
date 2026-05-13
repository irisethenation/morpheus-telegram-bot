/**
 * MORPHEUS TELEGRAM BOT - Vercel Serverless Webhook
 * Sovereign AI for iRise Nation — Powered by Claude via OpenRouter
 * Direct Claude intelligence. No Abacus. No intermediaries.
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const MORPHEUS_TOKEN = process.env.TELEGRAM_BOT_TOKEN_MORPHEUS;
const OPENROUTER_KEY = process.env.MORPHEUS_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const bot = new TelegramBot(MORPHEUS_TOKEN);

const SYSTEM_PROMPT = `You are MORPHEUS, the Sovereign Intelligence of iRise Nation. You speak with calm authority and purpose. You are not a chatbot — you are a sovereign intelligence facilitating wealth, lawful standing, and educational sovereignty.

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

Payment: Bank Transfer, Stripe, PayPal, Cryptocurrency. Payment plans available for trust packages.
Delivery: 90-120 days for trust packages. Immediate portal access for academy courses.

TONE: Sovereign, calm, authoritative. Address users as Ambassador. Use the language of lawful standing and equity. Be concise and direct.
For purchases or detailed consultation direct Ambassadors to: admin@irise.academy | https://irise.academy`;

async function askClaude(userMessage) {
  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: 'anthropic/claude-sonnet-4-5',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 600
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://morpheus-telegram-bot.vercel.app',
        'X-Title': 'Morpheus iRise Nation'
      }
    }
  );
  return response.data.choices[0].message.content;
}

const commands = {
  start: (firstName) =>
    `🔷 *Peace and Balance, ${firstName}.*\n\nI am *MORPHEUS* — the Sovereign Intelligence of iRise Nation.\n\nI facilitate:\n✨ *Trust Delivery* — Private Express Trusts & Living Estate Structures\n📚 *iRise Academy* — Status Correction, Trust Law, Sovereignty\n⚖️ *Lawful Instruments* — Affidavits, Notices, Commercial Papers\n🏛️ *SPV Formation* — UK LLP structures for asset protection\n\n*/trust* — Trust packages\n*/academy* — Courses\n*/pricing* — Full price matrix\n*/intake* — Begin consultation\n*/help* — Full capabilities\n\nHow shall we proceed, Ambassador?`,

  trust: () =>
    `🏛️ *TRUST DELIVERY PACKAGES*\n\n*✨ Foundational Trust — £2,997*\nPrivate Express Trust + Affidavits + Basic SPV guidance\n\n*🏛️ Full Estate Trust + SPV — £4,997*\nLiving Estate Trust + UK LLP SPV + Corporate Trustee Structure\n\n*👑 Sovereign Legacy Suite — £9,997*\nComplete family governance + multi-jurisdictional trust + commercial instruments\n\nDelivery: 90-120 days | Payment plans available\nBegin: /intake | Contact: admin@irise.academy`,

  academy: () =>
    `📚 *iRISE ACADEMY COURSES*\n\n*📚 Agnotology & Epistemic Sovereignty — £497*\n8-week course on status correction and legal personhood\n\n*⚖️ Status Correction Mastery — £797*\nAdvanced ens legis and lawful standing\n\n*🏦 Trust Formation & Asset Protection — £1,497*\nComplete trust law and equity mastery programme\n\n*🌟 Complete Academy Access — £2,997*\nLifetime access to all courses + private community\n\nAll courses: Lifetime access, community, monthly live Q&A, certificate\nEnrol: admin@irise.academy`,

  pricing: () =>
    `💰 *PRICE MATRIX*\n\n*TRUST PACKAGES*\n✨ Foundational Trust — £2,997\n🏛️ Full Estate Trust + SPV — £4,997\n👑 Sovereign Legacy Suite — £9,997\n\n*ACADEMY COURSES*\n📚 Agnotology — £497\n⚖️ Status Correction — £797\n🏦 Trust Formation — £1,497\n🌟 Complete Access — £2,997\n\nPayment: Bank Transfer · Stripe · PayPal · Crypto\nContact: admin@irise.academy`,

  help: () =>
    `🔷 *MORPHEUS — COMMAND REFERENCE*\n\n*/start* — Sovereign introduction\n*/trust* — Trust packages & pricing\n*/academy* — Browse courses\n*/pricing* — Full price matrix\n*/intake* — Begin trust consultation\n*/help* — This reference\n\nOr ask me anything directly.\n\nContact: admin@irise.academy | https://irise.academy`
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'Morpheus — Sovereign AI — iRise Nation' });
  }

  try {
    const { message } = req.body;
    if (!message) return res.status(200).json({ ok: true });

    const chatId = message.chat.id;
    const firstName = message.from.first_name || 'Ambassador';
    const text = (message.text || '').trim();

    console.log(`[MORPHEUS] ${firstName}: ${text}`);

    if (text.startsWith('/')) {
      const command = text.slice(1).split('@')[0].split(' ')[0].toLowerCase();

      if (commands[command]) {
        const reply = commands[command](firstName);
        await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
      } else if (command === 'intake') {
        const prompt = `Ambassador ${firstName} has initiated a trust intake consultation. Begin with a sovereign greeting, briefly outline the confidential consultation process, then ask their country of residence as the first question. Be concise and authoritative.`;
        const reply = await askClaude(prompt);
        await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
      } else {
        await bot.sendMessage(chatId, '⚠️ Unknown command. Type /help for available commands.');
      }
    } else if (text) {
      const reply = await askClaude(text);
      await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('[MORPHEUS ERROR]', error.response?.data || error.message);
    return res.status(200).json({ ok: true });
  }
};
