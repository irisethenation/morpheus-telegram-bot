const { v4: uuidv4 } = require('uuid');

const TRUST_PRODUCTS = {
  foundational: {
    name: "✨ Foundational Trust",
    price: 2997,
    description: "Private Express Trust + Affidavits + Basic SPV guidance",
    deliverables: ["Trust Deed", "Declaration of Trust", "Affidavit Package", "Status Correction Guide"]
  },
  full_estate: {
    name: "🏛️ Full Estate Trust + SPV",
    price: 4997,
    description: "Living Estate Trust + UK LLP SPV + Corporate Trustee Structure",
    deliverables: ["Complete Trust Instrument", "SPV Formation Docs", "Trustee Resolution", "Asset Protection Strategy"]
  },
  sovereign: {
    name: "👑 Sovereign Legacy Suite",
    price: 9997,
    description: "Complete family governance + multi-jurisdictional trust + commercial instruments",
    deliverables: ["Multi-Trust Architecture", "Family Constitution", "Commercial Bill Templates", "Perpetual Governance Framework"]
  }
};

async function execute(context, meta) {
  const { action, firstName, userId, chatId } = context;

  if (action === 'intake') {
    const intakePayload = {
      agent_uuid: meta.agentId,
      agent_type: meta.agentType,
      spawned_by: meta.spawnedBy,
      user_id: userId,
      user_name: firstName,
      chat_id: chatId,
      purpose: "Trust Intake Interview",
      timestamp: new Date().toISOString()
    };
    console.log('[MORPHEUS SPAWN] TrustAgent intake:', intakePayload);

    return {
      type: 'message',
      text: `🔷 *Trust Intake Interview Initiated*

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
What is your current country of residence?`
    };
  }

  let text = "🏛️ *TRUST DELIVERY PACKAGES*\n\n";
  for (const p of Object.values(TRUST_PRODUCTS)) {
    text += `*${p.name}* — £${p.price.toLocaleString()}\n`;
    text += `${p.description}\n`;
    text += `Deliverables: ${p.deliverables.join(', ')}\n\n`;
  }
  text += "*Delivery Timeline:* 90-120 days from intake completion\n";
  text += "*Payment Plans Available:* Contact for custom arrangements\n\n";
  text += "To proceed: /intake";

  return { type: 'message', text };
}

module.exports = { execute, agentType: 'TrustAgent' };
