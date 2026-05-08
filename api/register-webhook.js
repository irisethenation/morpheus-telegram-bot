const axios = require('axios');

// One-shot Telegram webhook registration endpoint.
// Call after every deployment to ensure Telegram knows the current URL.
//
//   GET  /api/register-webhook?key=<MORPHEUS_API_KEY>
//        → registers webhook + returns status
//
//   GET  /api/register-webhook?key=<MORPHEUS_API_KEY>&check=1
//        → just returns current webhook info without changing it

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const key = req.query.key || req.headers['x-api-key'];
  if (!key || key !== process.env.MORPHEUS_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN_MORPHEUS;
  if (!TOKEN) {
    return res.status(500).json({
      error: 'TELEGRAM_BOT_TOKEN_MORPHEUS not set in Vercel env vars',
      fix: 'Add it at vercel.com → Settings → Environment Variables',
    });
  }

  const TG = `https://api.telegram.org/bot${TOKEN}`;

  // ── CHECK ONLY ────────────────────────────────────────────────────────────
  if (req.query.check) {
    const info = await axios.get(`${TG}/getWebhookInfo`).catch(e => ({ data: { error: e.message } }));
    const me   = await axios.get(`${TG}/getMe`).catch(e => ({ data: {} }));
    return res.json({
      bot:     me.data?.result,
      webhook: info.data?.result,
    });
  }

  // ── REGISTER ──────────────────────────────────────────────────────────────
  // Build the webhook URL from the current request's host
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  const webhookUrl = `${proto}://${host}/api/webhook`;

  try {
    // Delete existing webhook first (clean slate)
    await axios.post(`${TG}/deleteWebhook`, { drop_pending_updates: false });

    // Set new webhook
    const setResult = await axios.post(`${TG}/setWebhook`, {
      url:             webhookUrl,
      allowed_updates: ['message', 'callback_query', 'my_chat_member'],
      drop_pending_updates: false,
    });

    // Verify
    const info = await axios.get(`${TG}/getWebhookInfo`);
    const me   = await axios.get(`${TG}/getMe`);

    const webhook = info.data?.result;
    const bot     = me.data?.result;

    const ok = webhook?.url === webhookUrl && !webhook?.last_error_message;

    return res.json({
      ok,
      registered_url:    webhook?.url,
      bot_username:      bot?.username,
      bot_id:            bot?.id,
      pending_updates:   webhook?.pending_update_count,
      last_error:        webhook?.last_error_message || null,
      last_error_time:   webhook?.last_error_date    || null,
      message: ok
        ? `✅ Morpheus webhook registered successfully at ${webhookUrl}`
        : `⚠️ Webhook set but may have issues — check last_error`,
    });
  } catch (err) {
    return res.status(500).json({
      error:   err.message,
      detail:  err.response?.data,
      token_ok: TOKEN?.length > 10,
    });
  }
};
