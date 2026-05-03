const orchestrator = require('../../lib/morpheusOrchestrator');
const { AGENT_TYPES } = orchestrator;

// Vercel Cron — runs daily at 09:00 UTC.
// Generates today's content and publishes to the iRise Telegram channel.
module.exports = async (req, res) => {
  // Vercel Cron passes Authorization header — verify it matches CRON_SECRET.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Step 1: ContentAgent generates today's post
    const content = await orchestrator.dispatch(AGENT_TYPES.CONTENT, {});

    // Step 2: PublisherAgent sends it to the channel
    const result = await orchestrator.dispatch(AGENT_TYPES.PUBLISHER, {
      channelId: null, // uses IRISE_CHANNEL_ID env var
      text: content.text,
      mediaUrl: null,
      mediaType: null
    });

    console.log(`[MORPHEUS CRON] social-post published — tag: ${content.tag}, message_id: ${result.message_id}`);
    return res.status(200).json({ ok: true, tag: content.tag, message_id: result.message_id });

  } catch (error) {
    console.error('[MORPHEUS CRON ERROR] social-post:', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
