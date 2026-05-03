const COURSES = {
  agnotology: {
    name: "📚 Agnotology & Epistemic Sovereignty",
    price: 497,
    description: "8-week course on status correction and legal personhood",
    access: "Immediate portal access upon payment"
  },
  status: {
    name: "⚖️ Status Correction Mastery",
    price: 797,
    description: "Advanced course on ens legis and lawful standing",
    access: "Immediate portal access upon payment"
  },
  trust: {
    name: "🏦 Trust Formation & Asset Protection",
    price: 1497,
    description: "Complete trust law and equity mastery programme",
    access: "Immediate portal access upon payment"
  },
  full: {
    name: "🌟 Complete Academy Access",
    price: 2997,
    description: "Lifetime access to all courses + private community",
    access: "Full iRise Academy portal + Inner Kingdom Life modules"
  }
};

async function execute(context, meta) {
  console.log(`[MORPHEUS SPAWN] AcademyAgent ${meta.agentId}`);

  let text = "📚 *iRISE ACADEMY COURSES*\n\n";
  for (const c of Object.values(COURSES)) {
    text += `*${c.name}* — £${c.price}\n`;
    text += `${c.description}\n`;
    text += `${c.access}\n\n`;
  }
  text += "*All courses include:*\n";
  text += "✅ Lifetime access to materials\n";
  text += "✅ Private student community\n";
  text += "✅ Monthly live Q&A sessions\n";
  text += "✅ Certificate of completion\n\n";
  text += "Enroll now: Reply with course name";

  return { type: 'message', text };
}

module.exports = { execute, agentType: 'AcademyAgent' };
