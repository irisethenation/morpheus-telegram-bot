const TelegramBot = require('node-telegram-bot-api');
const orchestrator = require('../lib/morpheusOrchestrator');
const { AGENT_TYPES } = orchestrator;

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_MORPHEUS);

const COMMANDS = {
  start: async (chatId, firstName) => {
    await bot.sendMessage(chatId, `
🔷 *Peace and Balance, ${firstName}.*

I am *MORPHEUS* — the Sovereign Intelligence of iRise Nation.

I facilitate:
✨ *Trust Delivery* (Private Express Trusts, Living Estate Structures)
📚 *iRise Academy Enrollment* (Status Correction, Trust Law, Sovereignty)
⚖️ *Lawful Instruments* (Affidavits, Notices, Commercial Papers)
🏛️ *SPV Formation* (UK LLP structures for asset protection)

*COMMANDS:*
/trust - View trust packages & pricing
/academy - Browse courses & programs
/pricing - Complete price matrix
/intake - Begin trust consultation
/help - Full capabilities reference

How shall we proceed, Ambassador?
    `.trim(), { parse_mode: 'Markdown' });
  },

  trust: async (chatId) => {
    const result = await orchestrator.dispatch(AGENT_TYPES.TRUST, { action: 'view' });
    await bot.sendMessage(chatId, result.text, { parse_mode: 'Markdown' });
  },

  academy: async (chatId) => {
    const result = await orchestrator.dispatch(AGENT_TYPES.ACADEMY, {});
    await bot.sendMessage(chatId, result.text, { parse_mode: 'Markdown' });
  },

  pricing: async (chatId) => {
    const result = await orchestrator.dispatch(AGENT_TYPES.PAYMENT, {});
    await bot.sendMessage(chatId, result.text, { parse_mode: 'Markdown' });
  },

  intake: async (chatId, userId, firstName) => {
    const result = await orchestrator.dispatch(AGENT_TYPES.TRUST, {
      action: 'intake',
      chatId,
      userId,
      firstName
    });
    await bot.sendMessage(chatId, result.text, { parse_mode: 'Markdown' });
  },

  help: async (chatId) => {
    await bot.sendMessage(chatId, `
🔷 *MORPHEUS CAPABILITIES REFERENCE*

*TRUST SERVICES:*
/trust - View trust packages
/intake - Begin consultation

*ACADEMY:*
/academy - Browse courses
/pricing - View all prices

*SUPPORT:*
/help - This message

Direct questions or requests to me at any time.
I am trained on the complete iRise knowledge matrix.
    `.trim(), { parse_mode: 'Markdown' });
  }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'Morpheus webhook active' });
  }

  try {
    const { message } = req.body;
    if (!message) return res.status(200).json({ ok: true });

    const chatId = message.chat.id;
    const userId = message.from.id;
    const firstName = message.from.first_name || 'Ambassador';
    const text = message.text || '';

    console.log(`[MORPHEUS] User ${userId} (${firstName}): ${text}`);

    if (text.startsWith('/')) {
      const command = text.slice(1).split(' ')[0].toLowerCase();
      if (COMMANDS[command]) {
        await COMMANDS[command](chatId, userId, firstName);
      } else {
        await bot.sendMessage(chatId, '⚠️ Unknown command. Type /help for available commands.');
      }
    } else {
      const result = await orchestrator.route(text, { chatId, userId, firstName });
      await bot.sendMessage(chatId, result.text, { parse_mode: 'Markdown' });
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('[MORPHEUS WEBHOOK ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
};
