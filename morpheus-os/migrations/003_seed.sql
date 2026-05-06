-- Morpheus OS — Migration 003: Seed Data
-- Initial winning_assets and SOPs so engines function from day one

-- ─────────────────────────────────────────────
-- WINNING ASSETS — SMS Templates
-- ─────────────────────────────────────────────

-- Cold outreach (agency)
INSERT INTO winning_assets (type, name, engine, context, content, success_rate, uses, wins) VALUES
('sms_template', 'Agency Cold Outreach v1', 'agency', 'cold_outreach',
'Hi {{name}}, I''m Patrick from GEM Agency. We help businesses scale their revenue through strategic marketing and AI-powered systems. I''d love to show you what we''ve built for clients like yours — 15 mins this week?',
0.18, 0, 0),

('sms_template', 'Agency Cold Outreach v2 — Pain Point', 'agency', 'cold_outreach',
'Hey {{name}}, quick question — are you getting consistent leads every month, or is it still hit and miss? We solved that for 3 similar businesses last quarter. Worth a quick call?',
0.22, 0, 0),

-- Booking nudge (agency)
('sms_template', 'Agency Booking Nudge', 'agency', 'booking_nudge',
'Hi {{name}}, following up — I have a slot open Thursday at 2pm or Friday at 11am. Either work for you? Happy to jump on a quick call and share some ideas.',
0.30, 0, 0),

-- Follow-up (agency)
('sms_template', 'Agency Follow-Up Post-Call', 'agency', 'follow_up',
'Great speaking with you {{name}}. I''ll send the proposal over today. Let me know if you have any questions — we''re ready to move when you are.',
0.45, 0, 0),

-- Upsell (agency)
('sms_template', 'Agency Upsell — Add-On Services', 'agency', 'upsell',
'{{name}}, based on the results we''ve been getting, I think there''s a next-level opportunity for you. Can I share something I''ve been working on specifically for your business?',
0.25, 0, 0);

-- Cold outreach (property)
INSERT INTO winning_assets (type, name, engine, context, content, success_rate, uses, wins) VALUES
('sms_template', 'Property Cold Outreach v1', 'property', 'cold_outreach',
'Hi {{name}}, I''m sourcing off-market properties in your area for cash buyers. If you''re looking to sell quickly and avoid agent fees, I can make you an offer this week. Interested?',
0.20, 0, 0),

('sms_template', 'Property Cold Outreach v2 — Landlord', 'property', 'cold_outreach',
'Hi {{name}}, I work with property investors looking for buy-to-let opportunities. If you have a property you''d consider selling, I can give you a fair cash offer within 24 hours. No obligation.',
0.17, 0, 0),

('sms_template', 'Property Booking Nudge', 'property', 'booking_nudge',
'{{name}}, I''d love to give you a quick valuation and explain exactly how the process works. Takes about 10 minutes. When''s a good time this week?',
0.28, 0, 0),

('sms_template', 'Property Follow-Up Post-Offer', 'property', 'follow_up',
'{{name}}, just checking in on the offer I sent. Happy to discuss any questions. We can exchange within 28 days if you''re ready to proceed.',
0.40, 0, 0),

('sms_template', 'Property Upsell — Investor Pack', 'property', 'upsell',
'{{name}}, given your interest, I think you''d benefit from our investor sourcing package — we find the deals so you don''t have to. Want me to send the details?',
0.22, 0, 0);

-- Academy outreach
INSERT INTO winning_assets (type, name, engine, context, content, success_rate, uses, wins) VALUES
('sms_template', 'Academy Cold Outreach v1', 'academy', 'cold_outreach',
'Hi {{name}}, are you aware that as a living man/woman you have rights and standing that most people never learn about? The iRise Academy teaches status correction, trust law, and sovereign living. Worth 5 mins of your time?',
0.15, 0, 0),

('sms_template', 'Academy Booking Nudge', 'academy', 'booking_nudge',
'{{name}}, I''d love to walk you through the iRise Academy curriculum and help you choose the right course for where you are. When''s a good time for a quick call?',
0.26, 0, 0),

('sms_template', 'Academy Follow-Up', 'academy', 'follow_up',
'{{name}}, your course access is confirmed. Head to academy.irise.nation to get started. Let me know if you need anything — your journey begins now.',
0.60, 0, 0),

('sms_template', 'Academy Upsell — Full Access', 'academy', 'upsell',
'{{name}}, you''ve been making great progress. Have you considered upgrading to Complete Academy Access? Lifetime access to all courses plus the private community. I can arrange a special rate for existing students.',
0.32, 0, 0);

-- Grant outreach
INSERT INTO winning_assets (type, name, engine, context, content, success_rate, uses, wins) VALUES
('sms_template', 'Grant Cold Outreach v1', 'grant', 'cold_outreach',
'Hi {{name}}, many businesses and individuals qualify for grants they don''t know about. We identify and apply for funding on your behalf — no win, no fee. Worth a quick conversation?',
0.19, 0, 0),

('sms_template', 'Grant Booking Nudge', 'grant', 'booking_nudge',
'{{name}}, I''ve identified 2-3 grants you may qualify for based on your profile. Can we get 20 minutes to go through them?',
0.35, 0, 0);

-- ─────────────────────────────────────────────
-- WINNING ASSETS — Offers
-- ─────────────────────────────────────────────
INSERT INTO winning_assets (type, name, engine, context, content, success_rate, uses, wins) VALUES
('offer', 'Trust Foundational — Fast-Track', 'agency', 'upsell',
'Fast-track Foundational Trust formation in 60 days (vs standard 120). Includes Trust Deed, Affidavit Package, and Status Correction Guide. £2,997.',
0.28, 0, 0),

('offer', 'Academy Bundle — Trust + Status', 'academy', 'upsell',
'Trust Formation & Asset Protection course bundled with Status Correction Mastery at £1,997 (saving £297 vs individual purchase).',
0.35, 0, 0),

('offer', 'Property Investor Pack', 'property', 'upsell',
'Monthly deal-sourcing retainer — we find, assess, and present 3-5 BMV deals per month. £497/month.',
0.20, 0, 0),

('offer', 'Agency Growth Retainer', 'agency', 'upsell',
'Full-service marketing retainer: strategy, content, paid ads, and monthly reporting. From £1,500/month.',
0.18, 0, 0),

('offer', 'Grant Application Bundle', 'grant', 'upsell',
'We identify all eligible grants and submit up to 5 applications on your behalf. Success fee only — 10% of awarded amount.',
0.40, 0, 0);

-- ─────────────────────────────────────────────
-- WINNING ASSETS — Email Templates
-- ─────────────────────────────────────────────
INSERT INTO winning_assets (type, name, engine, context, content, success_rate, uses, wins) VALUES
('email_template', 'Agency Proposal Follow-Up Email', 'agency', 'follow_up',
'Subject: Your GEM Agency Proposal — Next Steps\n\nHi {{name}},\n\nIt was great speaking with you. As promised, please find the proposal attached.\n\nKey points:\n• [Insert 3 key deliverables]\n• Timeline: [X weeks]\n• Investment: £[amount]\n\nI''m available for any questions this week. Shall we schedule a brief call to walk through it together?\n\nBest,\nPatrick\nGEM Agency',
0.38, 0, 0),

('email_template', 'Academy Welcome Email', 'academy', 'cold_outreach',
'Subject: Peace and Balance — Welcome to iRise Nation\n\nHi {{name}},\n\nWelcome to iRise Nation. Your sovereign journey begins now.\n\nThe iRise Academy equips you with knowledge of your lawful standing, trust formation, and status correction — knowledge that has been deliberately kept from the many.\n\nYour first step: /start on @MorpheusiRise_bot\n\nIn sovereignty,\niRise Nation',
0.55, 0, 0);

-- ─────────────────────────────────────────────
-- SOPs
-- ─────────────────────────────────────────────
INSERT INTO sop_procedures (name, engine, steps) VALUES
('agency_new_lead', 'agency', '[
  {"step": 1, "action": "Send cold outreach SMS within 1 hour of lead creation", "agent": "sentinel", "condition": "lead.phone exists"},
  {"step": 2, "action": "If no reply after 48h, trigger VAPI AI follow-up call", "agent": "sentinel", "condition": "stage = outreach_sent AND outreach_count = 1"},
  {"step": 3, "action": "On reply, send booking nudge SMS within 30 minutes", "agent": "sentinel", "condition": "stage = replied"},
  {"step": 4, "action": "On booking confirmed, dispatch Trinity for qualification", "agent": "trinity", "condition": "stage = call_booked"},
  {"step": 5, "action": "Post-call: Creator drafts proposal, Sigma scores lead", "agent": "creator", "condition": "stage = call_done"},
  {"step": 6, "action": "On close: Sentinel creates Stripe invoice, sends to lead", "agent": "sentinel", "condition": "stage = closed"},
  {"step": 7, "action": "Post-payment: Phoenix sends onboarding, Kappa grants portal access if applicable", "agent": "phoenix", "condition": "stage = invoiced"}
]'),

('academy_enrollment', 'academy', '[
  {"step": 1, "action": "Send welcome SMS and email immediately on new lead", "agent": "phoenix", "condition": "always"},
  {"step": 2, "action": "If no response after 24h, Kappa sends course overview SMS", "agent": "kappa", "condition": "stage = outreach_sent"},
  {"step": 3, "action": "On interest: Kappa sends enrollment link with payment options", "agent": "kappa", "condition": "stage = replied"},
  {"step": 4, "action": "On payment: grant portal access, send Brevo enrollment confirmation", "agent": "kappa", "condition": "stage = invoiced"},
  {"step": 5, "action": "After 7 days: Sigma checks engagement, Kappa sends upsell if active", "agent": "sigma", "condition": "stage = invoiced AND days_since_payment >= 7"}
]'),

('trust_intake', 'agency', '[
  {"step": 1, "action": "Trinity initiates 5-stage intake interview via Telegram", "agent": "trinity", "condition": "always"},
  {"step": 2, "action": "Mapondera reviews estate data at stage 2 completion", "agent": "mapondera", "condition": "intake_stage >= 2"},
  {"step": 3, "action": "Trinity generates structure recommendation after stage 5", "agent": "trinity", "condition": "intake_stage = complete"},
  {"step": 4, "action": "Creator drafts trust deed template based on recommendation", "agent": "creator", "condition": "structure_agreed = true"},
  {"step": 5, "action": "Sentinel creates payment link for agreed package", "agent": "sentinel", "condition": "structure_agreed = true"}
]'),

('property_lead', 'property', '[
  {"step": 1, "action": "Run property comps for postcode within 1 hour", "agent": "sigma", "condition": "lead.postcode exists"},
  {"step": 2, "action": "Send cold outreach SMS with BMV angle", "agent": "sentinel", "condition": "comps_complete = true"},
  {"step": 3, "action": "If no reply 72h: VAPI AI call with property valuation opener", "agent": "sentinel", "condition": "stage = outreach_sent"},
  {"step": 4, "action": "On booking: Mapondera reviews estate/property structure", "agent": "mapondera", "condition": "stage = call_booked"},
  {"step": 5, "action": "Post-call: submit formal offer, update pipeline", "agent": "sentinel", "condition": "stage = call_done"},
  {"step": 6, "action": "On agreed: Trinity prepares legal instrument templates", "agent": "trinity", "condition": "stage = closed"}
]');
