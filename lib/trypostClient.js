/**
 * TryPost API client.
 * Connects to the self-hosted TryPost instance at TRYPOST_URL.
 * Used by ContentAgent to schedule multi-platform posts.
 *
 * Supported platform slugs (match TryPost provider keys):
 *   facebook, instagram, x, tiktok, youtube
 */

const axios = require('axios');

const TRYPOST_URL     = process.env.TRYPOST_URL;      // e.g. https://social.irise.academy
const TRYPOST_API_KEY = process.env.TRYPOST_API_KEY;  // API token from TryPost dashboard

const ALL_PLATFORMS = ['facebook', 'instagram', 'x', 'tiktok', 'youtube'];

function client() {
  return axios.create({
    baseURL: `${TRYPOST_URL}/api/v1`,
    headers: {
      Authorization: `Bearer ${TRYPOST_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    timeout: 15000
  });
}

/**
 * Schedule a post to one or more platforms via TryPost.
 *
 * @param {string}   text       - Post body text
 * @param {string[]} platforms  - Subset of ALL_PLATFORMS (defaults to all)
 * @param {string}   [mediaUrl] - Public URL of image or video to attach
 * @param {Date}     [scheduleAt] - When to publish; omit for immediate
 * @returns {object} TryPost API response
 */
async function schedulePost({ text, platforms = ALL_PLATFORMS, mediaUrl = null, scheduleAt = null }) {
  if (!TRYPOST_URL || !TRYPOST_API_KEY) {
    throw new Error('TryPost not configured — set TRYPOST_URL and TRYPOST_API_KEY env vars.');
  }

  const payload = {
    content:    text,
    platforms,
    schedule_at: scheduleAt ? new Date(scheduleAt).toISOString() : null,
    publish_now: !scheduleAt
  };

  if (mediaUrl) {
    payload.media = [{ url: mediaUrl }];
  }

  const { data } = await client().post('/posts', payload);
  return data;
}

module.exports = { schedulePost, ALL_PLATFORMS };
