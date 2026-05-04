const { postToChannel } = require('../telegramPublisher');

async function execute(context, meta) {
  const { channelId, text, mediaUrl, mediaType } = context;
  console.log(`[MORPHEUS SPAWN] PublisherAgent ${meta.agentId} → channel ${channelId}`);

  const target = channelId || process.env.IRISE_CHANNEL_ID;
  if (!target) throw new Error('channel_id required');

  const result = await postToChannel(target, text, mediaUrl || null, mediaType || 'photo');
  return { type: 'publish', ok: true, message_id: result.result?.message_id };
}

module.exports = { execute, agentType: 'PublisherAgent' };
