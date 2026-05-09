const SCRIPTS = {
  investor_activation:
`I'm locking 1–2 off-market deals this week (US/UK).
Serious buyers only.

Send:
• Location preference
• Budget range
• ROI expectation
• Proof of funds

Must be ready to close within 5 days.`,

  deal_sourcing:
`Looking for discounted deals that need to move this week.

Cash buyers ready.

Send:
• Purchase price
• ARV / Market value
• Rehab estimate
• Timeline`,

  website_outreach: (businessName, previewUrl) =>
`Quick one — we've already built a working version of ${businessName}'s website.

You can view it here:
${previewUrl}

If you want it activated and bringing in leads, we can set it live within 48 hours.

Let me know if you want access.`,

  website_follow_up: (businessName) =>
`Hi — just checking you saw the site preview for ${businessName}.

We can activate it immediately and connect it to lead capture.

Let me know if you want it live today.`,

  website_close:
`We're closing onboarding this week — can activate your site today if confirmed.

✅ Activation: £300–£500
✅ Lead automation add-on: £500–£1,000

Reply to confirm.`,

  jv_offer:
`Looking to joint venture on a strong deal this week.

Bringing: Deal access + investor network
Seeking: Capital or local expertise

Deal will generate £3k–£7k net.
Reply if interested.`,

  buyer_push: (location, price, arv, roi, region = 'UK') =>
`Off-market deal matching your criteria:

Location: ${location}
Price: ${region === 'US' ? '$' : '£'}${Number(price).toLocaleString()}
ARV: ${region === 'US' ? '$' : '£'}${Number(arv).toLocaleString()}
Estimated ROI: ${roi}%

Ready to assign this week.
Let me know if you want priority.`
};

module.exports = { SCRIPTS };
