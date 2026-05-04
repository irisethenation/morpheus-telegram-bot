const axios = require('axios');

const MORPHEUS_URL = process.env.MORPHEUS_API_URL || 'http://51.79.29.15:19000';
const MORPHEUS_KEY = process.env.MORPHEUS_API_KEY;
const TRINITY_CHAT_ID = process.env.TRINITY_ADMIN_CHAT_ID;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_MORPHEUS;

const headers = () => ({ 'X-API-Key': MORPHEUS_KEY, 'Content-Type': 'application/json' });

const notifyTelegram = async (text) => {
  if (!BOT_TOKEN || !TRINITY_CHAT_ID) return;
  await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    { chat_id: TRINITY_CHAT_ID, text, parse_mode: 'Markdown' },
    { timeout: 8000 }
  ).catch(() => {});
};

const storeLead = async (lead) => {
  const message = [
    `NEW GEM LEAD — ${new Date().toISOString()}`,
    `Name: ${lead.name}`,
    `Business: ${lead.business}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone}`,
    `Industry: ${lead.industry}`,
    `Bottleneck: ${lead.bottleneck}`,
    `Source: gemtheagency.com/contact-form`,
  ].join('\n');

  // Log to Morpheus core via message API (Trinity will pick up and outreach)
  await axios.post(
    `${MORPHEUS_URL}/api/morpheus/message`,
    {
      message: `TRINITY_LEAD_INTAKE: ${message}`,
      session_id: `gem_lead_${Date.now()}`,
      context: { type: 'gem_website_lead', lead }
    },
    { headers: headers(), timeout: 20000 }
  );
};

const runOutreachSkill = async (lead) => {
  // Attempt to run Trinity's outreach skill if available on OVH
  await axios.post(
    `${MORPHEUS_URL}/skills/run`,
    {
      name: 'trinity_outreach',
      payload: {
        type: 'gem_lead_follow_up',
        contact: { name: lead.name, email: lead.email, phone: lead.phone },
        business: lead.business,
        industry: lead.industry,
        priority: 'high',
        script: 'website_outreach',
        follow_up_hours: 2
      }
    },
    { headers: headers(), timeout: 15000 }
  ).catch(() => {}); // Non-fatal — skill may not exist yet on OVH
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, business, email, phone, industry, bottleneck } = req.body || {};

  if (!name || !email || !industry) {
    return res.status(400).json({ error: 'name, email and industry are required' });
  }

  const lead = { name, business: business || '', email, phone: phone || '', industry, bottleneck: bottleneck || '' };

  try {
    // Fire-and-forget to OVH — don't block the response on it
    const ovhPromise = storeLead(lead).catch(() => {});
    const skillPromise = runOutreachSkill(lead).catch(() => {});

    // Telegram alert to admin — immediate notification of new lead
    const tgAlert = notifyTelegram([
      `🔥 *NEW GEM LEAD*`,
      `Name: ${name}`,
      `Business: ${business || '—'}`,
      `Industry: ${industry}`,
      `Email: ${email}`,
      `Phone: ${phone || '—'}`,
      `Bottleneck: ${bottleneck || '—'}`,
      `\n_Respond within 2 hours_`,
    ].join('\n'));

    await Promise.allSettled([ovhPromise, skillPromise, tgAlert]);

    return res.status(200).json({ ok: true, message: 'Lead received — we\'ll be in touch within 2 hours' });

  } catch (err) {
    console.error('Lead submission error:', err.message);
    // Still return success to the user — lead notification may have partially worked
    return res.status(200).json({ ok: true, message: 'Request received' });
  }
};
