const { v4: uuidv4 } = require('uuid');

const PACKAGES = {
  foundational: {
    name: "✨ Foundational Trust",
    price: 2997,
    tagline: "Your first layer of sovereign protection",
    description: "Private Express Trust + Affidavits + Basic SPV guidance",
    deliverables: ["Trust Deed", "Declaration of Trust", "Affidavit Package", "Status Correction Guide"],
    timeline: "28 days from completed intake"
  },
  full_estate: {
    name: "🏛️ Full Estate Trust + SPV",
    price: 4997,
    tagline: "Complete estate architecture with commercial structure",
    description: "Living Estate Trust + UK LLP SPV + Corporate Trustee Structure",
    deliverables: ["Complete Trust Instrument", "SPV Formation Docs", "Trustee Resolution", "Asset Protection Strategy"],
    timeline: "45 days from completed intake"
  },
  sovereign: {
    name: "👑 Sovereign Legacy Suite",
    price: 9997,
    tagline: "Multi-generational family governance",
    description: "Complete family governance + multi-jurisdictional trust + commercial instruments",
    deliverables: ["Multi-Trust Architecture", "Family Constitution", "Commercial Bill Templates", "Perpetual Governance Framework"],
    timeline: "90 days from completed intake"
  }
};

// Multi-fork intake stages.
// Each stage has: message, nextStage function (takes answer → next stage key)
const INTAKE_STAGES = {
  jurisdiction: {
    message: (firstName) => `🔷 *Step 1 of 6 — Your Jurisdiction*

Ambassador ${firstName}, let us begin designing the structure of your Living Estate.

*What is your current country of residence?*

_(This determines which trust law framework applies to your estate.)_`,
    next: () => 'operations'
  },

  operations: {
    message: () => `🏗️ *Step 2 of 6 — Your Endeavours*

Now it is time to design the structure of your trust by understanding what your current business operations are like — or how you would like them to be — so that your trust protects you and we can create your custom guide based on your intended endeavours throughout your Living Estate.

*Which best describes your situation?*

Reply with a number:
1️⃣ I have an existing business or company
2️⃣ I am self-employed / sole trader
3️⃣ I hold property or land
4️⃣ I have digital or investment assets (crypto, stocks, IP)
5️⃣ I am building something new — no current structure
6️⃣ A combination of the above`,
    next: (answer) => {
      const a = answer.trim();
      if (a === '1' || a === '6') return 'business_detail';
      if (a === '3') return 'property_detail';
      return 'assets';
    }
  },

  business_detail: {
    message: () => `🏢 *Step 2b — Your Business Structure*

What type of entity do you currently operate through?

1️⃣ Limited Company (Ltd)
2️⃣ LLP
3️⃣ Sole Trader / Self-employed
4️⃣ Partnership
5️⃣ Not yet incorporated — planning stage`,
    next: () => 'assets'
  },

  property_detail: {
    message: () => `🏠 *Step 2b — Your Property Holdings*

How do you currently hold your property?

1️⃣ In my personal name
2️⃣ Through a Ltd company
3️⃣ Joint ownership (partner/family)
4️⃣ Inherited — probate involved
5️⃣ Not yet purchased — planning to acquire`,
    next: () => 'assets'
  },

  assets: {
    message: () => `💎 *Step 3 of 6 — Assets to Protect*

Which assets would you like placed under trust protection?
_(Select all that apply — reply with numbers separated by commas)_

1️⃣ Residential property
2️⃣ Commercial property
3️⃣ Business / company shares
4️⃣ Cryptocurrency or digital assets
5️⃣ Cash savings / bank accounts
6️⃣ Intellectual property
7️⃣ Vehicles or valuables
8️⃣ Future inheritance / estate`,
    next: () => 'beneficiaries'
  },

  beneficiaries: {
    message: () => `👨‍👩‍👧 *Step 4 of 6 — Beneficiaries*

Who are the intended beneficiaries of your Living Estate?

1️⃣ Myself (self-benefit trust)
2️⃣ My children
3️⃣ My partner / spouse
4️⃣ Extended family
5️⃣ A charitable or sovereign cause
6️⃣ A combination`,
    next: () => 'spv'
  },

  spv: {
    message: () => `🏛️ *Step 5 of 6 — SPV Requirement*

A Special Purpose Vehicle (UK LLP) can sit beneath your trust to hold commercial operations and separate liability cleanly.

*Do you require an SPV structure?*

1️⃣ Yes — I need commercial separation
2️⃣ Not sure — advise me
3️⃣ No — trust structure only`,
    next: (answer) => {
      const a = answer.trim();
      if (a === '1') return 'recommendation_spv';
      if (a === '3') return 'recommendation_trust';
      return 'recommendation_consult';
    }
  },

  recommendation_spv: {
    message: () => `✅ *Step 6 of 6 — Your Recommended Structure*

Based on your Living Estate profile, we recommend:

*🏛️ Full Estate Trust + SPV — £4,997*
${PACKAGES.full_estate.description}

📋 *Your Custom Deliverables:*
${PACKAGES.full_estate.deliverables.map(d => `• ${d}`).join('\n')}

⏱️ *Timeline:* ${PACKAGES.full_estate.timeline}
🔍 *Trust Review:* Available separately at £497 — recommended 12 months post-delivery

We will begin building your custom trust guide the moment your intake is complete.

*To proceed, reply:* CONFIRM
*To discuss:* Reply with your question`,
    next: () => 'confirmed'
  },

  recommendation_trust: {
    message: () => `✅ *Step 6 of 6 — Your Recommended Structure*

Based on your Living Estate profile, we recommend:

*✨ Foundational Trust — £2,997*
${PACKAGES.foundational.description}

📋 *Your Custom Deliverables:*
${PACKAGES.foundational.deliverables.map(d => `• ${d}`).join('\n')}

⏱️ *Timeline:* ${PACKAGES.foundational.timeline}
🔍 *Trust Review:* Available separately at £497 — recommended 12 months post-delivery

*To proceed, reply:* CONFIRM
*To discuss:* Reply with your question`,
    next: () => 'confirmed'
  },

  recommendation_consult: {
    message: () => `🔷 *Step 6 of 6 — Consultation Recommended*

Your estate profile suggests a bespoke structure. A senior trust consultant will review your answers and prepare a personalised recommendation within *48 hours*.

*Trust Review is also available as a standalone service — £497*
Ideal for existing structures needing an independent audit.

*To request your consultation, reply:* CONSULT
*To ask a question:* Reply freely`,
    next: () => 'confirmed'
  },

  confirmed: {
    message: (firstName) => `🔷 *Thank you, Ambassador ${firstName}.*

Your intake has been received and is now with the iRise Trust team.

You will receive:
📩 A confirmation summary within 24 hours
📋 Your custom trust design guide within 48 hours
⚖️ Your trust instrument within the agreed timeline

*Peace and Sovereignty.*
_iRise Nation Trust Delivery_`,
    next: () => null
  }
};

async function execute(context, meta) {
  const { action, firstName, userId, chatId, segment, greeting, currentStage, lastAnswer } = context;

  // Resuming a multi-stage intake conversation
  if (currentStage) {
    const stage = INTAKE_STAGES[currentStage];
    if (!stage) return { type: 'message', text: '⚠️ Stage not found. Reply /intake to restart.' };

    const nextStageKey = stage.next(lastAnswer || '');
    if (!nextStageKey) {
      return {
        type: 'intake_complete',
        text: INTAKE_STAGES.confirmed.message(firstName)
      };
    }

    return {
      type: 'intake_stage',
      nextStage: nextStageKey,
      text: INTAKE_STAGES[nextStageKey].message(firstName)
    };
  }

  if (action === 'intake') {
    const payload = {
      agent_uuid: meta.agentId,
      agent_type: meta.agentType,
      spawned_by: meta.spawnedBy,
      user_id: userId,
      user_name: firstName,
      chat_id: chatId,
      purpose: "Trust Intake — Living Estate Design",
      timestamp: new Date().toISOString()
    };
    console.log('[MORPHEUS SPAWN] TrustAgent intake:', payload);

    return {
      type: 'intake_stage',
      nextStage: 'jurisdiction',
      text: INTAKE_STAGES.jurisdiction.message(firstName)
    };
  }

  // Default: package overview
  const personalGreeting = greeting ? `${greeting}\n\n` : '';
  let text = `${personalGreeting}🏛️ *TRUST DELIVERY PACKAGES*\n\n`;
  for (const p of Object.values(PACKAGES)) {
    text += `*${p.name}* — £${p.price.toLocaleString()}\n`;
    text += `_${p.tagline}_\n`;
    text += `${p.description}\n`;
    text += `⏱️ ${p.timeline}\n\n`;
  }
  text += "🔍 *Trust Review* — £497 (standalone audit of existing structures)\n\n";
  text += "To begin your Living Estate: /intake";

  return { type: 'message', text };
}

module.exports = { execute, agentType: 'TrustAgent', INTAKE_STAGES, PACKAGES };
