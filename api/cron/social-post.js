const orchestrator = require('../../lib/morpheusOrchestrator');
const { AGENT_TYPES } = orchestrator;

// Vercel Cron — runs daily at 09:00 UTC.
// ContentAgent distributes to all platforms via TryPost (FB/IG/X/TikTok/YouTube)
// then PublisherAgent posts to the Telegram channel.
module.exports = async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Step 1: ContentAgent generates today's post AND distributes via TryPost
    const content = await orchestrator.dispatch(AGENT_TYPES.CONTENT, {
      topic: null,     // uses daily rotation; set a topic string for AI generation
      mediaUrl: null,  // attach a public image/video URL here when available
      telegramOnly: false
    });

    // Step 2: PublisherAgent sends to Telegram channel
    const telegramResult = await orchestrator.dispatch(AGENT_TYPES.PUBLISHER, {
      channelId: null,
      text: content.text,
      mediaUrl: null,
      mediaType: null
    });

    const summary = {
      ok: true,
      tag: content.tag,
      telegram_message_id: telegramResult.message_id,
      platforms_distributed: content.distribution?.platforms ?? ['telegram']
    };

    console.log('[MORPHEUS CRON] social-post complete:', summary);
    return res.status(200).json(summary);

  } catch (error) {
    console.error('[MORPHEUS CRON ERROR] social-post:', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
