const axios = require('axios');
const { schedulePost, ALL_PLATFORMS } = require('../trypostClient');

// Pre-written post rotation — starts immediately, no API key required.
// Posts cycle by day-of-year mod length. Add more to increase variety.
const CONTENT_ROTATION = [
  {
    tag: 'sovereignty',
    text: `🔷 <b>What is a Living Estate?</b>

Most people spend their lives building assets in their legal name — unprotected, exposed to liability, and subject to probate upon death.

A <b>Living Estate Trust</b> changes that.

Your assets move out of the legal fiction and into a sovereign structure — managed by you, protected by trust law, and passed on without court interference.

This is not offshore. This is lawful. This is your right.

📩 Begin your consultation: t.me/MorpheusiRise_bot

<i>iRise Nation — Sovereignty through Intelligence.</i>`
  },
  {
    tag: 'academy',
    text: `📚 <b>Why most people never correct their legal status — and how iRise Academy changes that.</b>

The difference between a <b>legal person</b> and a <b>living man or woman</b> is one of the most consequential pieces of knowledge you will ever encounter.

iRise Academy courses cover:
• Agnotology &amp; Epistemic Sovereignty
• Status Correction Mastery
• Trust Formation &amp; Asset Protection

Sovereign knowledge. Immediate portal access upon enrollment.

🎓 Explore the Academy: t.me/MorpheusiRise_bot /academy`
  },
  {
    tag: 'trust_review',
    text: `⚖️ <b>Already have a trust? When did you last review it?</b>

Trust law evolves. Circumstances change. A structure built two years ago may no longer serve your estate as intended.

iRise Nation offers a standalone <b>Trust Review — £497</b>

Independent audit. Written report. Recommendations for strengthening or restructuring.

✅ Book a review: t.me/MorpheusiRise_bot`
  },
  {
    tag: 'spv',
    text: `🏛️ <b>The SPV Advantage</b>

A Special Purpose Vehicle (UK LLP) sitting beneath your trust creates a clean separation between your Living Estate and your commercial operations.

What this means in practice:
→ Business liability stays in the LLP
→ Personal estate remains protected in the trust
→ Income flows lawfully between structures

This is the architecture used by those who understand the system.

📩 Design your structure: t.me/MorpheusiRise_bot /trust`
  },
  {
    tag: 'urgency',
    text: `🔷 <b>Your estate is unprotected right now.</b>

Not because protection is impossible — but because no one showed you how.

iRise Nation exists to change that. Trust delivery. Academy education. Sovereign instruments. All under one roof.

Your Living Estate starts with a 15-minute intake.

→ t.me/MorpheusiRise_bot — reply /intake to begin.`
  },
  {
    tag: 'academy_launch',
    text: `📣 <b>iRise Academy — Coming to its permanent home.</b>

We are finalising the Academy portal at <b>irise.academy</b>.

In the meantime, all course enrollment, consultation, and trust delivery runs through MORPHEUS — your sovereign intelligence interface.

Start here: t.me/MorpheusiRise_bot

<i>Sovereignty through Intelligence. Education through Action.</i>`
  }
];

function getTodaysPost() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return CONTENT_ROTATION[dayOfYear % CONTENT_ROTATION.length];
}

async function generateWithClaude(topic) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const { data } = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Write a Telegram channel post for iRise Nation on the topic: "${topic}".
Tone: sovereign, authoritative, educational. No fluff.
Format: HTML (bold with <b>, no markdown).
End with a CTA to t.me/MorpheusiRise_bot.
Max 200 words.`
      }]
    }, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      timeout: 10000
    });

    return data.content?.[0]?.text || null;
  } catch (err) {
    console.warn('[CONTENT] Claude generation failed, using rotation:', err.message);
    return null;
  }
}

/**
 * Distribute content across all platforms.
 *
 * - TryPost handles: Facebook, Instagram, X, TikTok, YouTube Shorts
 * - PublisherAgent (caller) handles: Telegram channel
 *
 * If TryPost is not yet configured (TRYPOST_URL missing), logs a warning
 * and returns content for Telegram-only distribution — no hard failure.
 */
async function distributeViaTryPost(text, mediaUrl = null) {
  try {
    const result = await schedulePost({
      text,
      platforms: ALL_PLATFORMS,
      mediaUrl,
      scheduleAt: null  // publish immediately
    });
    console.log('[CONTENT] TryPost distribution OK:', result?.id || result);
    return { trypost: true, platforms: ALL_PLATFORMS };
  } catch (err) {
    console.warn('[CONTENT] TryPost unavailable — Telegram only:', err.message);
    return { trypost: false, platforms: ['telegram'] };
  }
}

async function execute(context, meta) {
  const { topic, mediaUrl = null, telegramOnly = false } = context;
  console.log(`[MORPHEUS SPAWN] ContentAgent ${meta.agentId}`);

  const claudePost = topic ? await generateWithClaude(topic) : null;
  const post = claudePost ? { text: claudePost, tag: 'ai_generated' } : getTodaysPost();

  // Distribute to all social platforms via TryPost (unless caller requests Telegram only)
  const distribution = telegramOnly ? { trypost: false, platforms: ['telegram'] }
    : await distributeViaTryPost(post.text, mediaUrl);

  return {
    type: 'content',
    text: post.text,
    tag: post.tag,
    distribution
  };
}

module.exports = { execute, agentType: 'ContentAgent', CONTENT_ROTATION };
