const TRUST_PRICES = [
  { name: "✨ Foundational Trust", price: 2997 },
  { name: "🏛️ Full Estate Trust + SPV", price: 4997 },
  { name: "👑 Sovereign Legacy Suite", price: 9997 }
];

const COURSE_PRICES = [
  { name: "📚 Agnotology & Epistemic Sovereignty", price: 497 },
  { name: "⚖️ Status Correction Mastery", price: 797 },
  { name: "🏦 Trust Formation & Asset Protection", price: 1497 },
  { name: "🌟 Complete Academy Access", price: 2997 }
];

async function execute(context, meta) {
  console.log(`[MORPHEUS SPAWN] PaymentAgent ${meta.agentId}`);

  let text = "💰 *COMPLETE PRICE MATRIX*\n\n*TRUST PACKAGES:*\n";
  for (const p of TRUST_PRICES) {
    text += `${p.name} — £${p.price.toLocaleString()}\n`;
  }
  text += "\n*ACADEMY COURSES:*\n";
  for (const c of COURSE_PRICES) {
    text += `${c.name} — £${c.price.toLocaleString()}\n`;
  }
  text += "\n*Payment Methods:*\n";
  text += "✅ Bank Transfer (UK/International)\n";
  text += "✅ Stripe (Card payments)\n";
  text += "✅ PayPal\n";
  text += "✅ Cryptocurrency (Bitcoin/Ethereum)\n\n";
  text += "Payment plans available for trust packages.";

  return { type: 'message', text };
}

module.exports = { execute, agentType: 'PaymentAgent' };
