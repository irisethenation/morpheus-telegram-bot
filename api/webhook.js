const TelegramBot = require('node-telegram-bot-api');
const orchestrator = require('../lib/morpheusOrchestrator');
const { AGENT_TYPES } = orchestrator;

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_MORPHEUS);

const COMMANDS = {
  start: async (chatId, userId, firstName) => {
    const result = await orchestrator.routeUser(userId, firstName, 'start');
    const greeting = result?.text
      ? result.text
      : `🔷 *Peace and Balance, ${firstName}.*

I am *MORPHEUS* — the Sovereign Intelligence of iRise Nation.

*/trust* — Living Estate packages
*/academy* — Courses & enrollment
*/pricing* — Full price matrix
*/intake* — Begin trust consultation
*/help* — Capabilities reference`;
    await bot.sendMessage(chatId, greeting, { parse_mode: 'Markdown' });
  },

  trust: async (chatId, userId, firstName) => {
    const result = await orchestrator.dispatch(AGENT_TYPES.TRUST, { action: 'view', userId, firstName });
    await bot.sendMessage(chatId, result.text, { parse_mode: 'Markdown' });
  },

  academy: async (chatId, userId, firstName) => {
    const result = await orchestrator.dispatch(AGENT_TYPES.ACADEMY, { userId, firstName });
    await bot.sendMessage(chatId, result.text, { parse_mode: 'Markdown' });
  },

  pricing: async (chatId, userId, firstName) => {
    const result = await orchestrator.dispatch(AGENT_TYPES.PAYMENT, { userId, firstName });
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
    await bot.sendMessage(chatId, `🔷 *MORPHEUS — Command Reference*

*/trust* — Living Estate packages & pricing
*/intake* — Begin trust consultation
*/academy* — Browse courses
*/pricing* — Full price matrix
*/help* — This message

Ask me anything — I am trained on the complete iRise knowledge matrix.`, { parse_mode: 'Markdown' });
  }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'Morpheus webhook active' });
  }

  try {
    const { message } = req.body;
    if (!message) return res.status(200).json({ ok: true });

    const chatId   = message.chat.id;
    const userId   = message.from.id;
    const firstName = message.from.first_name || 'Ambassador';
    const text     = message.text || '';

    console.log(`[MORPHEUS] User ${userId} (${firstName}): ${text}`);

    if (text.startsWith('/')) {
      const command = text.slice(1).split(' ')[0].toLowerCase();
      if (COMMANDS[command]) {
        await COMMANDS[command](chatId, userId, firstName);
      } else {
        await bot.sendMessage(chatId, '⚠️ Unknown command. Type /help for available commands.');
      }
    } else {
      // All free-text routes through Trinity intelligence → segment-aware routing
      const result = await orchestrator.routeUser(userId, firstName, text);
      await bot.sendMessage(chatId, result.text, { parse_mode: 'Markdown' });
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('[MORPHEUS WEBHOOK ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
};
