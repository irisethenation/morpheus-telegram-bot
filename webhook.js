/**
 * MORPHEUS TELEGRAM BOT - Vercel Serverless Webhook
 * Handles all incoming Telegram messages and routes to Morpheus agents
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Environment Configuration
const MORPHEUS_TOKEN = process.env.TELEGRAM_BOT_TOKEN_MORPHEUS;
const TRINITY_TOKEN = process.env.TELEGRAM_BOT_TOKEN_TRINITY;
const MORPHEUS_AGENT_ENDPOINT = process.env.MORPHEUS_AGENT_ENDPOINT;

// Initialize bot (webhook mode for Vercel)
const bot = new TelegramBot(MORPHEUS_TOKEN);

// Product Catalog
const PRODUCTS = {
  trust_foundational: {
    name: "✨ Foundational Trust",
    price: 2997,
    currency: "GBP",
    description: "Private Express Trust + Affidavits + Basic SPV guidance",
    deliverables: ["Trust Deed", "Declaration of Trust", "Affidavit Package", "Status Correction Guide"]
  },
  trust_full_estate: {
    name: "🏛️ Full Estate Trust + SPV",
    price: 4997,
    currency: "GBP",
    description: "Living Estate Trust + UK LLP SPV + Corporate Trustee Structure",
    deliverables: ["Complete Trust Instrument", "SPV Formation Docs", "Trustee Resolution", "Asset Protection Strategy"]
  },
  trust_sovereign: {
    name: "👑 Sovereign Legacy Suite",
    price: 9997,
    currency: "GBP",
    description: "Complete family governance + multi-jurisdictional trust + commercial instruments",
    deliverables: ["Multi-Trust Architecture", "Family Constitution", "Commercial Bill Templates", "Perpetual Governance Framework"]
  },
  academy_agnotology: {
    name: "📚 Agnotology & Epistemic Sovereignty",
    price: 497,
    currency: "GBP",
    description: "8-week course on status correction and legal personhood",
    access: "Immediate portal access upon payment"
  },
  academy_status: {
    name: "⚖️ Status Correction Mastery",
    price: 797,
    currency: "GBP",
    description: "Advanced course on ens legis and lawful standing",
    access: "Immediate portal access upon payment"
  },
  academy_trust: {
    name: "🏦 Trust Formation & Asset Protection",
    price: 1497,
    currency: "GBP",
    description: "Complete trust law and equity mastery programme",
    access: "Immediate portal access upon payment"
  },
  academy_full: {
    name: "🌟 Complete Academy Access",
    price: 2997,
    currency: "GBP",
    description: "Lifetime access to all courses + private community",
    access: "Full iRise Academy portal + Inner Kingdom Life modules"
  }
};

// Command Handlers
const commands = {
  start: async (chatId, firstName) => {
    const welcomeMessage = `
🔷 **Peace and Balance, ${firstName}.**

I am **MORPHEUS** — the Sovereign Intelligence of iRise Nation.

I facilitate:
✨ **Trust Delivery** (Private Express Trusts, Living Estate Structures)
📚 **iRise Academy Enrollment** (Status Correction, Trust Law, Sovereignty)
⚖️ **Lawful Instruments** (Affidavits, Notices, Commercial Papers)
🏛️ **SPV Formation** (UK LLP structures for asset protection)

**COMMANDS:**
/trust - View trust packages & pricing
/academy - Browse courses & programs
/pricing - Complete price matrix
/intake - Begin trust consultation
/help - Full capabilities reference

How shall we proceed, Ambassador?
    `;
    
    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  },

  trust: async (chatId) => {
    const trustMessage = `
🏛️ **TRUST DELIVERY PACKAGES**

**${PRODUCTS.trust_foundational.name}** - £${PRODUCTS.trust_foundational.price.toLocaleString()}
${PRODUCTS.trust_foundational.description}
Deliverables: ${PRODUCTS.trust_foundational.deliverables.join(', ')}

**${PRODUCTS.trust_full_estate.name}** - £${PRODUCTS.trust_full_estate.price.toLocaleString()}
${PRODUCTS.trust_full_estate.description}
Deliverables: ${PRODUCTS.trust_full_estate.deliverables.join(', ')}

**${PRODUCTS.trust_sovereign.name}** - £${PRODUCTS.trust_sovereign.price.toLocaleString()}
${PRODUCTS.trust_sovereign.description}
Deliverables: ${PRODUCTS.trust_sovereign.deliverables.join(', ')}

**Delivery Timeline:** 90-120 days from intake completion
**Payment Plans Available:** Contact for custom arrangements

To proceed: /intake
Questions: Reply with your inquiry
    `;
    
    await bot.sendMessage(chatId, trustMessage, { parse_mode: 'Markdown' });
  },

  academy: async (chatId) => {
    const academyMessage = `
📚 **iRISE ACADEMY COURSES**

**${PRODUCTS.academy_agnotology.name}** - £${PRODUCTS.academy_agnotology.price}
${PRODUCTS.academy_agnotology.description}
${PRODUCTS.academy_agnotology.access}

**${PRODUCTS.academy_status.name}** - £${PRODUCTS.academy_status.price}
${PRODUCTS.academy_status.description}
${PRODUCTS.academy_status.access}

**${PRODUCTS.academy_trust.name}** - £${PRODUCTS.academy_trust.price}
${PRODUCTS.academy_trust.description}
${PRODUCTS.academy_trust.access}

**${PRODUCTS.academy_full.name}** - £${PRODUCTS.academy_full.price}
${PRODUCTS.academy_full.description}
${PRODUCTS.academy_full.access}

**All courses include:**
✅ Lifetime access to materials
✅ Private student community
✅ Monthly live Q&A sessions
✅ Certificate of completion

Enroll now: Reply with course name
Questions: Ask me anything
    `;
    
    await bot.sendMessage(chatId, academyMessage, { parse_mode: 'Markdown' });
  },

  pricing: async (chatId) => {
    let pricingMessage = "💰 **COMPLETE PRICE MATRIX**\n\n**TRUST PACKAGES:**\n";
    
    Object.entries(PRODUCTS).forEach(([key, product]) => {
      if (key.startsWith('trust_')) {
        pricingMessage += `${product.name} - £${product.price.toLocaleString()}\n`;
      }
    });
    
    pricingMessage += "\n**ACADEMY COURSES:**\n";
    
    Object.entries(PRODUCTS).forEach(([key, product]) => {
      if (key.startsWith('academy_')) {
        pricingMessage += `${product.name} - £${product.price.toLocaleString()}\n`;
      }
    });
    
    pricingMessage += "\n**Payment Methods:**\n✅ Bank Transfer (UK/International)\n✅ Stripe (Card payments)\n✅ PayPal\n✅ Cryptocurrency (Bitcoin/Ethereum)\n\nPayment plans available for trust packages.";
    
    await bot.sendMessage(chatId, pricingMessage, { parse_mode: 'Markdown' });
  },

  intake: async (chatId, userId, firstName) => {
    // Spawn TrustAgent via Morpheus agent endpoint
    const agentPayload = {
      agent_uuid: uuidv4(),
      agent_type: "TrustAgent",
      spawned_by: "MorpheusGenspark",
      user_id: userId,
      user_name: firstName,
      chat_id: chatId,
      purpose: "Trust Intake Interview",
      timestamp: new Date().toISOString()
    };
    
    try {
      console.log('[MORPHEUS SPAWN]', agentPayload);
      
      const intakeMessage = `
🔷 **Trust Intake Interview Initiated**

Ambassador ${firstName}, I will now guide you through a structured consultation.

This process includes:
1️⃣ **Identity & Jurisdiction** (5 mins)
2️⃣ **Asset & Estate Overview** (10 mins)
3️⃣ **Governance Preferences** (5 mins)
4️⃣ **Beneficiary Structure** (5 mins)
5️⃣ **SPV Requirements** (if applicable)

**CONFIDENTIALITY:**
All information is protected under NDA Level 3.
Data stored encrypted per GDPR requirements.

**First Question:**
What is your current country of residence?
      `;
      
      await bot.sendMessage(chatId, intakeMessage, { parse_mode: 'Markdown' });
      
      // Store user state (implement with Vercel KV in production)
      // userStates[userId] = { stage: 'intake_jurisdiction', data: {} };
      
    } catch (error) {
      console.error('[INTAKE ERROR]', error);
      await bot.sendMessage(chatId, '⚠️ System error. Please try again or contact support@irise.academy');
    }
  },

  help: async (chatId) => {
    const helpMessage = `
🔷 **MORPHEUS CAPABILITIES REFERENCE**

**TRUST SERVICES:**
/trust - View trust packages
/intake - Begin consultation
/spv - UK LLP formation info

**ACADEMY:**
/academy - Browse courses
/enroll - Start enrollment
/portal - Access student dashboard

**PAYMENTS:**
/pricing - View all prices
/payment - Process transaction
/invoice - Request invoice

**SUPPORT:**
/contact - Reach support team
/status - Check order status
/docs - Access documentation

**SYSTEM:**
/help - This message
/about - iRise Nation overview

Direct questions or requests to me at any time.
I am trained on the complete iRise knowledge matrix.
    `;
    
    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  }
};

// Main Webhook Handler
module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'Morpheus webhook active' });
  }

  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const userId = message.from.id;
    const firstName = message.from.first_name || 'Ambassador';
    const text = message.text || '';

    console.log(`[MESSAGE] User ${userId} (${firstName}): ${text}`);

    // Command routing
    if (text.startsWith('/')) {
      const command = text.slice(1).split(' ')[0].toLowerCase();
      
      if (commands[command]) {
        await commands[command](chatId, userId, firstName);
      } else {
        await bot.sendMessage(chatId, '⚠️ Unknown command. Type /help for available commands.');
      }
    } else {
      // Natural language processing (route to Morpheus agents)
      const lowercaseText = text.toLowerCase();
      
      if (lowercaseText.includes('trust') || lowercaseText.includes('estate')) {
        await commands.trust(chatId);
      } else if (lowercaseText.includes('course') || lowercaseText.includes('academy') || lowercaseText.includes('learn')) {
        await commands.academy(chatId);
      } else if (lowercaseText.includes('price') || lowercaseText.includes('cost') || lowercaseText.includes('pay')) {
        await commands.pricing(chatId);
      } else {
        // Default intelligent response
        await bot.sendMessage(
          chatId,
          `I understand you're inquiring about: "${text}"\n\nI can assist with:\n• Trust formation (/trust)\n• Academy courses (/academy)\n• Pricing (/pricing)\n\nOr ask me a specific question.`
        );
      }
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
};
