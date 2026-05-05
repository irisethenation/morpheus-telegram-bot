/**
 * MORPHEUS TELEGRAM BOT - Vercel Serverless Webhook
 * Sovereign Intelligence Orchestrator — iRise Nation
 *
 * Agent Stack (OVH-hosted, Morpheus-managed):
 *   Sigma     — Analytics & Assessment
 *   Kappa     — Academy & Enrollment
 *   Trinity   — Trust Formation & Legal Instruments
 *   Mapondera — Sovereignty & Estate Specialist
 *   Sentinel  — Monitoring & Order Status
 *   Phoenix   — Onboarding & Transformation
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Environment Configuration
const MORPHEUS_TOKEN = process.env.TELEGRAM_BOT_TOKEN_MORPHEUS;
const TRINITY_TOKEN  = process.env.TELEGRAM_BOT_TOKEN_TRINITY;
const OVH_AGENT_ENDPOINT = process.env.OVH_AGENT_ENDPOINT;

// Initialize Morpheus bot (webhook/stateless mode for Vercel)
const bot = new TelegramBot(MORPHEUS_TOKEN);

// Agent definitions — all hosted on OVH, orchestrated by Morpheus
const AGENTS = {
  sigma:     { name: 'Sigma',     role: 'Analytics & Assessment' },
  kappa:     { name: 'Kappa',     role: 'Academy & Enrollment' },
  trinity:   { name: 'Trinity',   role: 'Trust Formation & Legal Instruments' },
  mapondera: { name: 'Mapondera', role: 'Sovereignty & Estate Specialist' },
  sentinel:  { name: 'Sentinel',  role: 'Monitoring & Order Status' },
  phoenix:   { name: 'Phoenix',   role: 'Onboarding & Transformation' }
};

// Product Catalog
const PRODUCTS = {
  trust_foundational: {
    name: '✨ Foundational Trust',
    price: 2997,
    currency: 'GBP',
    description: 'Private Express Trust + Affidavits + Basic SPV guidance',
    deliverables: ['Trust Deed', 'Declaration of Trust', 'Affidavit Package', 'Status Correction Guide']
  },
  trust_full_estate: {
    name: '🏛️ Full Estate Trust + SPV',
    price: 4997,
    currency: 'GBP',
    description: 'Living Estate Trust + UK LLP SPV + Corporate Trustee Structure',
    deliverables: ['Complete Trust Instrument', 'SPV Formation Docs', 'Trustee Resolution', 'Asset Protection Strategy']
  },
  trust_sovereign: {
    name: '👑 Sovereign Legacy Suite',
    price: 9997,
    currency: 'GBP',
    description: 'Complete family governance + multi-jurisdictional trust + commercial instruments',
    deliverables: ['Multi-Trust Architecture', 'Family Constitution', 'Commercial Bill Templates', 'Perpetual Governance Framework']
  },
  academy_agnotology: {
    name: '📚 Agnotology & Epistemic Sovereignty',
    price: 497,
    currency: 'GBP',
    description: '8-week course on status correction and legal personhood',
    access: 'Immediate portal access upon payment'
  },
  academy_status: {
    name: '⚖️ Status Correction Mastery',
    price: 797,
    currency: 'GBP',
    description: 'Advanced course on ens legis and lawful standing',
    access: 'Immediate portal access upon payment'
  },
  academy_trust: {
    name: '🏦 Trust Formation & Asset Protection',
    price: 1497,
    currency: 'GBP',
    description: 'Complete trust law and equity mastery programme',
    access: 'Immediate portal access upon payment'
  },
  academy_full: {
    name: '🌟 Complete Academy Access',
    price: 2997,
    currency: 'GBP',
    description: 'Lifetime access to all courses + private community',
    access: 'Full iRise Academy portal + Inner Kingdom Life modules'
  }
};

// Dispatch a task to an OVH agent via Morpheus routing
async function dispatchAgent(agentKey, taskType, userId, firstName, chatId, data = {}) {
  const agent = AGENTS[agentKey];
  if (!agent) throw new Error(`Unknown agent: ${agentKey}`);

  const payload = {
    task_uuid: uuidv4(),
    agent: agentKey,
    agent_name: agent.name,
    task_type: taskType,
    dispatched_by: 'Morpheus',
    user_id: userId,
    user_name: firstName,
    chat_id: chatId,
    timestamp: new Date().toISOString(),
    data
  };

  if (OVH_AGENT_ENDPOINT) {
    await axios.post(OVH_AGENT_ENDPOINT, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000
    });
  }

  console.log(`[MORPHEUS → ${agent.name.toUpperCase()}]`, JSON.stringify(payload));
  return payload;
}

// Command Handlers
const commands = {
  start: async (chatId, userId, firstName) => {
    const msg = `
🔷 *Peace and Balance, ${firstName}.*

I am *MORPHEUS* — the Sovereign Intelligence of iRise Nation.

I orchestrate:
✨ *Trust Delivery* (Private Express Trusts, Living Estate Structures)
📚 *iRise Academy Enrollment* (Status Correction, Trust Law, Sovereignty)
⚖️ *Lawful Instruments* (Affidavits, Notices, Commercial Papers)
🏛️ *SPV Formation* (UK LLP structures for asset protection)

*COMMANDS:*
/trust — View trust packages & pricing
/academy — Browse courses & programs
/pricing — Complete price matrix
/intake — Begin trust consultation
/spv — UK LLP formation info
/enroll — Start course enrollment
/portal — Access student dashboard
/payment — Process a transaction
/invoice — Request an invoice
/contact — Reach the support team
/status — Check your order status
/docs — Access documentation
/about — iRise Nation overview
/help — Full capabilities reference

How shall we proceed, Ambassador?
    `;
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

    // Phoenix handles new arrivals
    await dispatchAgent('phoenix', 'user_start', userId, firstName, chatId);
  },

  trust: async (chatId, userId, firstName) => {
    const msg = `
🏛️ *TRUST DELIVERY PACKAGES*

*${PRODUCTS.trust_foundational.name}* — £${PRODUCTS.trust_foundational.price.toLocaleString()}
${PRODUCTS.trust_foundational.description}
Deliverables: ${PRODUCTS.trust_foundational.deliverables.join(', ')}

*${PRODUCTS.trust_full_estate.name}* — £${PRODUCTS.trust_full_estate.price.toLocaleString()}
${PRODUCTS.trust_full_estate.description}
Deliverables: ${PRODUCTS.trust_full_estate.deliverables.join(', ')}

*${PRODUCTS.trust_sovereign.name}* — £${PRODUCTS.trust_sovereign.price.toLocaleString()}
${PRODUCTS.trust_sovereign.description}
Deliverables: ${PRODUCTS.trust_sovereign.deliverables.join(', ')}

*Delivery Timeline:* 90–120 days from intake completion
*Payment Plans Available:* Contact for custom arrangements

To proceed: /intake
Questions: Reply with your inquiry
    `;
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

    // Trinity handles trust enquiries
    await dispatchAgent('trinity', 'trust_enquiry', userId, firstName, chatId);
  },

  academy: async (chatId, userId, firstName) => {
    const msg = `
📚 *iRISE ACADEMY COURSES*

*${PRODUCTS.academy_agnotology.name}* — £${PRODUCTS.academy_agnotology.price}
${PRODUCTS.academy_agnotology.description}
${PRODUCTS.academy_agnotology.access}

*${PRODUCTS.academy_status.name}* — £${PRODUCTS.academy_status.price}
${PRODUCTS.academy_status.description}
${PRODUCTS.academy_status.access}

*${PRODUCTS.academy_trust.name}* — £${PRODUCTS.academy_trust.price}
${PRODUCTS.academy_trust.description}
${PRODUCTS.academy_trust.access}

*${PRODUCTS.academy_full.name}* — £${PRODUCTS.academy_full.price}
${PRODUCTS.academy_full.description}
${PRODUCTS.academy_full.access}

*All courses include:*
✅ Lifetime access to materials
✅ Private student community
✅ Monthly live Q&A sessions
✅ Certificate of completion

To enroll: /enroll
Questions: Ask me anything
    `;
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

    // Kappa handles academy enquiries
    await dispatchAgent('kappa', 'academy_enquiry', userId, firstName, chatId);
  },

  pricing: async (chatId) => {
    let msg = '💰 *COMPLETE PRICE MATRIX*\n\n*TRUST PACKAGES:*\n';

    Object.entries(PRODUCTS).forEach(([key, product]) => {
      if (key.startsWith('trust_')) {
        msg += `${product.name} — £${product.price.toLocaleString()}\n`;
      }
    });

    msg += '\n*ACADEMY COURSES:*\n';

    Object.entries(PRODUCTS).forEach(([key, product]) => {
      if (key.startsWith('academy_')) {
        msg += `${product.name} — £${product.price.toLocaleString()}\n`;
      }
    });

    msg += '\n*Payment Methods:*\n✅ Bank Transfer (UK/International)\n✅ Stripe (Card payments)\n✅ PayPal\n✅ Cryptocurrency (Bitcoin/Ethereum)\n\nPayment plans available for trust packages.';

    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  },

  intake: async (chatId, userId, firstName) => {
    const msg = `
🔷 *Trust Intake Interview Initiated*

Ambassador ${firstName}, I will now guide you through a structured consultation.

This process includes:
1️⃣ *Identity & Jurisdiction* (5 mins)
2️⃣ *Asset & Estate Overview* (10 mins)
3️⃣ *Governance Preferences* (5 mins)
4️⃣ *Beneficiary Structure* (5 mins)
5️⃣ *SPV Requirements* (if applicable)

*CONFIDENTIALITY:*
All information is protected under NDA Level 3.
Data stored encrypted per GDPR requirements.

*First Question:*
What is your current country of residence?
    `;

    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

    // Trinity leads intake; Mapondera supports estate/sovereignty aspects
    await dispatchAgent('trinity', 'intake_start', userId, firstName, chatId, { stage: 1 });
    await dispatchAgent('mapondera', 'estate_review_standby', userId, firstName, chatId, { stage: 1 });
  },

  spv: async (chatId, userId, firstName) => {
    const msg = `
🏢 *UK LLP SPV FORMATION*

A Special Purpose Vehicle (SPV) via a UK Limited Liability Partnership provides:

✅ *Asset Segregation* — isolate assets from personal liability
✅ *Tax Efficiency* — transparent pass-through structure
✅ *Trustee Compatibility* — integrates with Private Express Trust
✅ *Commercial Instrument Issuance* — Bills of Exchange, Promissory Notes

*Formation Packages:*
• Basic SPV — included in Foundational Trust (£2,997)
• Full UK LLP SPV — included in Full Estate Trust (£4,997)
• Multi-jurisdiction SPV — included in Sovereign Legacy Suite (£9,997)

To proceed: /intake or /contact
    `;
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

    // Trinity handles SPV/legal formation
    await dispatchAgent('trinity', 'spv_enquiry', userId, firstName, chatId);
  },

  enroll: async (chatId, userId, firstName) => {
    const msg = `
📋 *COURSE ENROLLMENT*

Ambassador ${firstName}, to begin enrollment:

1. Choose your course from /academy
2. Confirm your selection by replying with the course name
3. You will receive a payment link
4. Portal access is granted within 24 hours of confirmed payment

*Available Courses:*
• Agnotology & Epistemic Sovereignty — £497
• Status Correction Mastery — £797
• Trust Formation & Asset Protection — £1,497
• Complete Academy Access — £2,997

Reply with your chosen course to proceed.
    `;
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

    // Kappa manages enrollment flow
    await dispatchAgent('kappa', 'enrollment_start', userId, firstName, chatId);
  },

  portal: async (chatId, userId, firstName) => {
    const msg = `
🖥️ *STUDENT PORTAL ACCESS*

Ambassador ${firstName}, your portal access details:

🔗 Portal: https://academy.irise.nation
📧 Login with your registered email address

If you have not yet enrolled: /enroll
If you have login issues: /contact

*Portal Features:*
✅ All enrolled course materials
✅ Live session recordings
✅ Private community access
✅ Certificate downloads
✅ Progress tracking
    `;
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

    // Kappa handles portal/academy access
    await dispatchAgent('kappa', 'portal_access_check', userId, firstName, chatId);
  },

  payment: async (chatId, userId, firstName) => {
    const msg = `
💳 *PAYMENT PROCESSING*

Ambassador ${firstName}, to process a payment:

*Accepted Methods:*
✅ Bank Transfer (UK/International)
✅ Stripe (Card payments)
✅ PayPal
✅ Cryptocurrency (BTC/ETH)

*Next Steps:*
1. Confirm the product you wish to purchase
2. A payment link or bank details will be sent to you
3. Confirm payment reference upon completion

Which product are you paying for? Reply with the name or use:
/trust — Trust packages
/academy — Academy courses
/pricing — Full price list
    `;
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

    // Sentinel tracks payment events
    await dispatchAgent('sentinel', 'payment_initiation', userId, firstName, chatId);
  },

  invoice: async (chatId, userId, firstName) => {
    const msg = `
🧾 *INVOICE REQUEST*

Ambassador ${firstName}, to receive a formal invoice:

Please provide:
1. Your full legal name
2. Business name (if applicable)
3. Billing address
4. Product/service purchased

Reply with these details and your invoice will be issued within 24 hours.

For VAT invoices, please also provide your VAT registration number.
    `;
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

    // Sentinel handles document/invoice dispatch
    await dispatchAgent('sentinel', 'invoice_request', userId, firstName, chatId);
  },

  contact: async (chatId, userId, firstName) => {
    const msg = `
📞 *CONTACT & SUPPORT*

*iRise Nation Support Channels:*

✉️ Email: support@irise.nation
📱 Telegram: @iRiseNationSupport
🌐 Web: https://irise.nation/contact

*Response Times:*
• General enquiries: 24–48 hours
• Active client matters: 4–8 hours
• Emergency (active order): Reply here with URGENT

Ambassador ${firstName}, you can also describe your issue here and I will route it to the appropriate agent.
    `;
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

    // Sentinel triages support requests
    await dispatchAgent('sentinel', 'support_contact', userId, firstName, chatId);
  },

  status: async (chatId, userId, firstName) => {
    const msg = `
📊 *ORDER STATUS CHECK*

Ambassador ${firstName}, to check your order status:

Please provide your:
• Order reference number, OR
• Email address used at purchase

*Typical Timelines:*
• Academy access: Granted within 24h of payment
• Trust formation: 90–120 days from intake completion
• SPV formation: 30–45 days from documentation receipt

I am routing your status request to Sentinel now.
    `;
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

    // Sentinel monitors and reports order status
    await dispatchAgent('sentinel', 'status_check', userId, firstName, chatId);
  },

  docs: async (chatId, userId, firstName) => {
    const msg = `
📁 *DOCUMENTATION ACCESS*

*Available Resources:*

📘 Trust Law Foundations — /trust
📗 Academy Curriculum Overview — /academy
📙 SPV Formation Guide — /spv
📕 Status Correction Primer — via Academy portal
📒 Lawful Notice Templates — client-only resource

*Client Document Vault:*
Access your personal documents at: https://vault.irise.nation
Login with your client credentials.

Need a specific document? Describe it here and I will locate it for you.
    `;
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

    // Sigma retrieves and surfaces documentation
    await dispatchAgent('sigma', 'docs_request', userId, firstName, chatId);
  },

  about: async (chatId) => {
    const msg = `
🔷 *ABOUT iRISE NATION*

iRise Nation is a Sovereign Intelligence System providing:

⚖️ *Trust & Estate Law Services*
Private Express Trusts, Living Estate Trusts, and multi-jurisdictional sovereign structures for families and individuals.

📚 *Sovereign Education*
The iRise Academy delivers courses on status correction, lawful standing, trust formation, and epistemic sovereignty.

🏛️ *Commercial Instruments*
Bills of Exchange, Promissory Notes, Affidavits, and Notices of Dishonour — correctly formed and lawfully issued.

🤖 *The Morpheus Agent Army (OVH)*
Morpheus orchestrates a sovereign stack of specialised agents — Sigma, Kappa, Trinity, Mapondera, Sentinel, and Phoenix — each handling a domain of service.

🌍 *Jurisdiction:* England & Wales, with multi-jurisdictional reach
📅 *Established:* Serving the sovereign community

_"We do not seek permission from the matrix. We build outside it."_
    `;
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  },

  help: async (chatId) => {
    const msg = `
🔷 *MORPHEUS CAPABILITIES REFERENCE*

*TRUST SERVICES:*
/trust — View trust packages
/intake — Begin consultation
/spv — UK LLP formation info

*ACADEMY:*
/academy — Browse courses
/enroll — Start enrollment
/portal — Access student dashboard

*PAYMENTS:*
/pricing — View all prices
/payment — Process transaction
/invoice — Request invoice

*SUPPORT:*
/contact — Reach support team
/status — Check order status
/docs — Access documentation

*SYSTEM:*
/help — This message
/about — iRise Nation overview

*Agent Stack (OVH):*
🔹 Sigma — Analytics & Assessment
🔹 Kappa — Academy & Enrollment
🔹 Trinity — Trust Formation & Legal
🔹 Mapondera — Sovereignty & Estate
🔹 Sentinel — Monitoring & Order Status
🔹 Phoenix — Onboarding & Transformation

All agents are sovereign-hosted on OVH infrastructure, orchestrated by Morpheus.
    `;
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  }
};

// Main Webhook Handler
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'Morpheus webhook active' });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(200).json({ ok: true });
    }

    const chatId    = message.chat.id;
    const userId    = message.from.id;
    const firstName = message.from.first_name || 'Ambassador';
    const text      = message.text || '';

    console.log(`[MESSAGE] User ${userId} (${firstName}): ${text}`);

    if (text.startsWith('/')) {
      const command = text.slice(1).split(' ')[0].toLowerCase();

      if (commands[command]) {
        await commands[command](chatId, userId, firstName);
      } else {
        await bot.sendMessage(chatId, '⚠️ Unknown command. Type /help for available commands.');
      }
    } else {
      // Natural language routing → appropriate agent
      const t = text.toLowerCase();

      if (t.includes('trust') || t.includes('estate')) {
        await commands.trust(chatId, userId, firstName);
      } else if (t.includes('spv') || t.includes('llp')) {
        await commands.spv(chatId, userId, firstName);
      } else if (t.includes('course') || t.includes('academy') || t.includes('learn') || t.includes('enroll')) {
        await commands.academy(chatId, userId, firstName);
      } else if (t.includes('price') || t.includes('cost') || t.includes('pay')) {
        await commands.pricing(chatId);
      } else if (t.includes('status') || t.includes('order')) {
        await commands.status(chatId, userId, firstName);
      } else if (t.includes('invoice') || t.includes('receipt')) {
        await commands.invoice(chatId, userId, firstName);
      } else if (t.includes('contact') || t.includes('support') || t.includes('help')) {
        await commands.contact(chatId, userId, firstName);
      } else {
        // Sigma assesses unclassified queries
        await dispatchAgent('sigma', 'unclassified_query', userId, firstName, chatId, { text });

        await bot.sendMessage(
          chatId,
          `I understand you're asking about: "${text}"\n\nI can assist with:\n• Trust formation (/trust)\n• Academy courses (/academy)\n• Pricing (/pricing)\n• SPV formation (/spv)\n\nOr ask me a specific question and I will route it to the right agent.`
        );
      }
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
};
