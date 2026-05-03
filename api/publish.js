const orchestrator = require('../lib/morpheusOrchestrator');
const { AGENT_TYPES } = orchestrator;

const PUBLISH_SECRET = process.env.PUBLISH_SECRET;

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

  try {
    const result = await orchestrator.dispatch(AGENT_TYPES.PUBLISHER, {
      channelId: channel_id || null,
      text,
      mediaUrl: media_url || null,
      mediaType: media_type || 'photo'
    });
    return res.status(200).json(result);
  } catch (error) {
    const description = error.response?.data?.description || error.message;
    console.error('[MORPHEUS PUBLISH ERROR]', description);
    return res.status(500).json({ ok: false, error: description });
  }
};
