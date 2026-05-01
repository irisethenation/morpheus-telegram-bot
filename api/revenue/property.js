const MIN_DISCOUNT = 20; // percent below ARV

const validate = ({ price, arv, rehab = 0 }) => {
  const discount = ((arv - price) / arv) * 100;
  const netEquity = arv - price - rehab;
  return {
    valid: discount >= MIN_DISCOUNT,
    discount: discount.toFixed(1),
    netEquity,
    roi: ((netEquity / price) * 100).toFixed(1)
  };
};

const generatePack = ({ location, price, arv, rehab = 0, exit = 'assign', region = 'uk' }) => {
  const c = region === 'us' ? '$' : '£';
  const { discount, netEquity, roi } = validate({ price, arv, rehab });
  return (
    `🏠 *DEAL PACK — ${location.toUpperCase()}*\n\n` +
    `📍 Location: ${location}\n` +
    `💰 Purchase Price: ${c}${Number(price).toLocaleString()}\n` +
    `📊 Market Value (ARV): ${c}${Number(arv).toLocaleString()}\n` +
    `🔨 Est. Rehab: ${c}${Number(rehab).toLocaleString()}\n` +
    `💵 Net Equity: ${c}${Number(netEquity).toLocaleString()}\n` +
    `📉 Discount to Market: ${discount}%\n` +
    `📈 Est. ROI: ${roi}%\n` +
    `🚪 Exit Strategy: ${exit.charAt(0).toUpperCase() + exit.slice(1)}\n\n` +
    `⚡ Assignment available — serious buyers only\n` +
    `Region: ${region.toUpperCase()}`
  );
};

const INFO = {
  us: {
    title: '🇺🇸 US REVERSE WHOLESALING',
    site: 'wepaycash4yourhouse.com',
    steps: [
      'Motivated seller submits via wepaycash4yourhouse.com',
      'Assess: ARV, rehab, 20%+ discount criteria',
      'Lock property under contract (as-is, any condition)',
      'Assign contract to cash buyer in network',
      'Collect assignment fee: $5,000–$15,000'
    ],
    fee: '$5,000–$15,000 per assignment',
    timeline: '5–14 days to close'
  },
  uk: {
    title: '🇬🇧 UK DEAL PACKAGING',
    site: 'wepaycash4yourhouse.com',
    steps: [
      'Source BMV property (agents, auctions, direct to vendor)',
      'Build full deal pack with analysis and exit strategy',
      'Present to qualified investor network',
      'Earn deal sourcing / packaging fee',
      'Collect: £3,000–£7,000 per deal'
    ],
    fee: '£3,000–£7,000 sourcing fee',
    timeline: '7–21 days'
  }
};

module.exports = { validate, generatePack, INFO };
