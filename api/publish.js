const { postToChannel } = require('../lib/telegramPublisher');

const PUBLISH_SECRET = process.env.PUBLISH_SECRET;
const DEFAULT_CHANNEL = process.env.IRISE_CHANNEL_ID;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers['x-publish-secret'];
  if (PUBLISH_SECRET && authHeader !== PUBLISH_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { channel_id, text, media_url, media_type } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  const target = channel_id || DEFAULT_CHANNEL;
  if (!target) {
    return res.status(400).json({ error: 'channel_id required (or set IRISE_CHANNEL_ID env var)' });
  }

  try {
    const result = await postToChannel(target, text, media_url || null, media_type || 'photo');
    return res.status(200).json({ ok: true, message_id: result.result?.message_id });
  } catch (error) {
    const description = error.response?.data?.description || error.message;
    console.error('[PUBLISH ERROR]', description);
    return res.status(500).json({ ok: false, error: description });
  }
};
