const axios = require('axios');

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || 'GEM The Agency <morpheus@gemtheagency.com>';
const MORPHEUS_URL = process.env.MORPHEUS_API_URL || 'http://51.79.29.15:19000';
const MORPHEUS_KEY = process.env.MORPHEUS_API_KEY;

const ovhHeaders = () => ({ 'X-API-Key': MORPHEUS_KEY, 'Content-Type': 'application/json' });

// Send an email via Resend and log to morpheus_core
const sendEmail = async ({ to, subject, html, text, replyTo, tags = [] }) => {
  if (!RESEND_KEY) throw new Error('RESEND_API_KEY not configured');

  const res = await axios.post(
    'https://api.resend.com/emails',
    {
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      reply_to: replyTo || 'morpheus@gemtheagency.com',
      tags: tags.map(t => ({ name: t.name, value: t.value })),
    },
    {
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    }
  );

  const emailId = res.data?.id;

  // Persist to morpheus_core via OVH message API
  axios.post(
    `${MORPHEUS_URL}/api/morpheus/message`,
    {
      message: `OUTREACH_LOG: action=sent email_id=${emailId} to=${Array.isArray(to) ? to[0] : to} subject="${subject}"`,
      session_id: `outreach_${emailId}`,
    },
    { headers: ovhHeaders(), timeout: 10000 }
  ).catch(() => {});

  return { id: emailId, status: 'sent' };
};

// Personalised outreach email for GEM website prospects
const buildOutreachEmail = ({ name, business, previewUrl }) => {
  const subject = `${name} — we built a preview for ${business}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#08080f;color:#ddddf0}
  .wrap{max-width:560px;margin:0 auto;padding:48px 24px}
  .logo{color:#f5c842;font-weight:800;font-size:1.1rem;letter-spacing:-.3px;margin-bottom:36px}
  h1{color:#fff;font-size:1.45rem;line-height:1.35;font-weight:700;margin-bottom:16px}
  p{color:#9090b8;line-height:1.75;margin-bottom:14px;font-size:.95rem}
  .preview-box{background:#111126;border:1px solid rgba(109,40,217,.25);border-radius:12px;padding:22px 24px;margin:28px 0}
  .preview-label{color:#6d28d9;font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;font-weight:600;margin-bottom:8px}
  .preview-name{color:#fff;font-weight:700;font-size:1rem;margin-bottom:8px}
  .preview-url{color:#8b5cf6;font-size:.83rem;word-break:break-all}
  .cta{display:inline-block;background:linear-gradient(135deg,#6d28d9,#1d4ed8);color:#fff !important;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:.95rem;margin:4px 0 28px}
  .divider{border:none;border-top:1px solid #1a1a2e;margin:32px 0}
  .footer{color:#444;font-size:.78rem;line-height:1.6}
  .footer a{color:#6d28d9;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <div class="logo">GEM The Agency</div>

  <h1>Hi ${name}, we built a preview for ${business}.</h1>

  <p>We've put together a personalised look at what ${business} could look like running on full AI automation — 24/7 lead capture, instant responses, automatic booking, e-sign contracts, and payment collection.</p>

  <p>No extra staff. No missed calls. No evening admin.</p>

  <div class="preview-box">
    <div class="preview-label">Your personalised preview</div>
    <div class="preview-name">${business}</div>
    <div class="preview-url">${previewUrl}</div>
  </div>

  <a href="${previewUrl}" class="cta">See your preview →</a>

  <p>It takes 60 seconds to look through. No commitment, no call required — just a preview of what's already built for you.</p>

  <p>If you want to walk through it together, reply to this email and we'll find 30 minutes that works.</p>

  <p style="color:#7070a0">— The GEM Team</p>

  <hr class="divider">
  <div class="footer">
    GEM The Agency · Global Executive Marketing Limited<br>
    You're receiving this because we identified <strong style="color:#666">${business}</strong> as a business that could benefit from AI automation.<br>
    <a href="https://gemtheagency.com">gemtheagency.com</a> &nbsp;·&nbsp; To unsubscribe, reply with "remove"
  </div>
</div>
</body>
</html>`;

  const text = `Hi ${name},

We've built a preview of what ${business} could look like running on full AI automation.

Your preview: ${previewUrl}

No extra staff. No missed calls. No evening admin.

It takes 60 seconds to look through. If you'd like to talk it through, just reply to this email.

— The GEM Team
GEM The Agency · gemtheagency.com

To unsubscribe, reply with "remove".`;

  return { subject, html, text };
};

module.exports = { sendEmail, buildOutreachEmail };
