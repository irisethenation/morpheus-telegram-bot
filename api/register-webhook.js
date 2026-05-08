const axios = require('axios');

// Telegram webhook self-registration — no separate API key needed.
// Auth is implicit: you must know the URL structure + have the bot token set in Vercel.
//
//  REGISTER:  GET /api/register-webhook
//  CHECK:     GET /api/register-webhook?check=1
//  DELETE:    GET /api/register-webhook?delete=1

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN_MORPHEUS;

  if (!TOKEN) {
    return res.status(500).json({
      error:  'TELEGRAM_BOT_TOKEN_MORPHEUS not set',
      fix:    'Add it at vercel.com → project → Settings → Environment Variables → Redeploy',
      status: 'no_token',
    });
  }

  const TG = `https://api.telegram.org/bot${TOKEN}`;

  // Verify token is valid first
  let botInfo;
  try {
    const meRes = await axios.get(`${TG}/getMe`, { timeout: 8000 });
    botInfo = meRes.data?.result;
    if (!botInfo?.id) throw new Error('Invalid bot response');
  } catch (err) {
    return res.status(401).json({
      error:  'Bot token rejected by Telegram — token may be wrong or revoked',
      detail: err.response?.data?.description || err.message,
      fix:    'Get a fresh token: BotFather → /mybots → Morpheus → API Token → Revoke',
    });
  }

  // ── CHECK ONLY ────────────────────────────────────────────────────────────
  if (req.query.check) {
    const info = await axios.get(`${TG}/getWebhookInfo`, { timeout: 8000 })
      .catch(() => ({ data: { result: {} } }));
    return res.json({
      ok:              true,
      bot:             { username: botInfo.username, id: botInfo.id },
      webhook:         info.data?.result,
      token_valid:     true,
    });
  }

  // ── DELETE ONLY ───────────────────────────────────────────────────────────
  if (req.query.delete) {
    await axios.post(`${TG}/deleteWebhook`, { drop_pending_updates: true }, { timeout: 8000 });
    return res.json({ ok: true, message: 'Webhook deleted' });
  }

  // ── REGISTER ──────────────────────────────────────────────────────────────
  const proto      = req.headers['x-forwarded-proto'] || 'https';
  const host       = req.headers['x-forwarded-host']  || req.headers.host;
  const webhookUrl = `${proto}://${host}/api/webhook`;

  // Delete existing first
  await axios.post(`${TG}/deleteWebhook`, { drop_pending_updates: false }, { timeout: 8000 })
    .catch(() => {});

  // Register
  const setRes = await axios.post(`${TG}/setWebhook`, {
    url:             webhookUrl,
    allowed_updates: ['message', 'callback_query', 'pre_checkout_query', 'successful_payment', 'my_chat_member'],
    drop_pending_updates: false,
  }, { timeout: 10000 }).catch(e => ({ data: { ok: false, description: e.message } }));

  // Verify
  const info = await axios.get(`${TG}/getWebhookInfo`, { timeout: 8000 })
    .catch(() => ({ data: { result: {} } }));

  const webhook   = info.data?.result;
  const registered = webhook?.url === webhookUrl;

  return res.json({
    ok:              registered,
    bot_username:    `@${botInfo.username}`,
    bot_id:          botInfo.id,
    registered_url:  webhook?.url,
    pending_updates: webhook?.pending_update_count || 0,
    last_error:      webhook?.last_error_message   || null,
    message:         registered
      ? `✅ @${botInfo.username} webhook registered at ${webhookUrl}`
      : `⚠️ Registration may have failed — check last_error`,
    stripe_stars:    'pre_checkout_query and successful_payment now included in allowed_updates',
  });
};
