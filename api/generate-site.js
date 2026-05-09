// Business website preview page — linked from gemtheagency.com outreach
module.exports = async (req, res) => {
  const slug = req.query.business || req.url.split('/preview/')[1]?.split('?')[0] || '';
  const businessName = decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase()) || 'Your Business';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${businessName} — Website Preview | GEM The Agency</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#080810;color:#fff;min-height:100vh}
    .hero{min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:2rem;background:radial-gradient(ellipse at top,#1a1a3e 0%,#080810 70%)}
    .badge{background:#ffd700;color:#000;padding:.4rem 1.2rem;border-radius:20px;font-size:.75rem;font-weight:800;letter-spacing:2px;text-transform:uppercase;margin-bottom:2rem}
    h1{font-size:clamp(2rem,7vw,4.5rem);font-weight:900;line-height:1.1;margin-bottom:1rem;background:linear-gradient(135deg,#fff 40%,#aaa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .sub{font-size:clamp(1rem,2.5vw,1.3rem);color:#999;max-width:560px;line-height:1.7;margin-bottom:3rem}
    .btns{display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;margin-bottom:4rem}
    .btn-p{background:#ffd700;color:#000;padding:1rem 2.5rem;border-radius:8px;font-weight:800;font-size:1.05rem;text-decoration:none;transition:transform .15s,box-shadow .15s}
    .btn-p:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(255,215,0,.4)}
    .btn-s{border:1px solid #333;color:#ccc;padding:1rem 2.5rem;border-radius:8px;font-size:1.05rem;text-decoration:none;transition:border-color .15s}
    .btn-s:hover{border-color:#ffd700;color:#fff}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1.2rem;max-width:780px;width:100%}
    .card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);padding:1.5rem;border-radius:12px;text-align:left}
    .icon{font-size:1.8rem;margin-bottom:.6rem}
    .card h3{font-size:.95rem;margin-bottom:.3rem}
    .card p{font-size:.82rem;color:#888;line-height:1.5}
    .banner{position:fixed;bottom:0;left:0;right:0;background:#ffd700;color:#000;padding:.75rem;text-align:center;font-weight:700;font-size:.88rem;z-index:100}
    .banner a{color:#000;text-decoration:underline}
  </style>
</head>
<body>
  <div class="hero">
    <div class="badge">Preview — Not Yet Live</div>
    <h1>${businessName}</h1>
    <p class="sub">Your AI-powered website is built and ready to go live.<br>Activate now and start capturing leads within 48 hours.</p>
    <div class="btns">
      <a href="https://gemtheagency.com" class="btn-p">Activate My Site →</a>
      <a href="https://gemtheagency.com" class="btn-s">View Pricing</a>
    </div>
    <div class="grid">
      <div class="card"><div class="icon">⚡</div><h3>Live in 48 Hours</h3><p>Your site goes live within 2 days of confirmation</p></div>
      <div class="card"><div class="icon">🎯</div><h3>Lead Capture Built In</h3><p>Forms, follow-up sequences, CRM sync — all ready</p></div>
      <div class="card"><div class="icon">📱</div><h3>Mobile First</h3><p>Perfect on every device — phone, tablet, desktop</p></div>
      <div class="card"><div class="icon">🔍</div><h3>Local SEO</h3><p>Optimised to rank for your local search terms</p></div>
    </div>
  </div>
  <div class="banner">
    Preview for <strong>${businessName}</strong> —
    <a href="https://gemtheagency.com">Contact GEM The Agency to activate</a>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};
