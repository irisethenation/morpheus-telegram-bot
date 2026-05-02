const axios = require('axios');

function apiUrl(method) {
  return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN_MORPHEUS}/${method}`;
}

async function postToChannel(channelId, text, mediaUrl = null, mediaType = 'photo') {
  if (mediaUrl) {
    const isVideo = mediaType === 'video';
    const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
    const mediaKey = isVideo ? 'video' : 'photo';
    const { data } = await axios.post(apiUrl(endpoint), {
      chat_id: channelId,
      [mediaKey]: mediaUrl,
      caption: text,
      parse_mode: 'HTML'
    });
    return data;
  }

  const { data } = await axios.post(apiUrl('sendMessage'), {
    chat_id: channelId,
    text,
    parse_mode: 'HTML'
  });
  return data;
}

module.exports = { postToChannel };
