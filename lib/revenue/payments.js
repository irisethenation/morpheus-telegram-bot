const METHODS = {
  uk: {
    entity: 'Global Executive Marketing Limited',
    bank: 'Tide',
    region: 'UK',
    currency: '£',
    reference: 'Include your full name + service/deal reference on payment',
    note: 'For UK property deals and UK business website sales'
  },
  us: {
    entity: 'Genesis 1One LLC',
    bank: 'Mercury',
    region: 'US',
    currency: '$',
    reference: 'Include your full name + deal/project reference on transfer',
    note: 'For US property deals and US business website sales. Wire details provided on invoice.'
  }
};

const get = (region = 'uk') => METHODS[region.toLowerCase()] || METHODS.uk;

const format = (region, amount, purpose) => {
  const m = get(region);
  return `💳 *PAYMENT DETAILS*\n\n` +
    `Entity: *${m.entity}*\n` +
    `Bank: *${m.bank}*\n` +
    `Amount: ${m.currency}${amount.toLocaleString()}\n` +
    `Purpose: ${purpose}\n\n` +
    `${m.reference}\n\n` +
    `_${m.note}_\n\n` +
    `✅ Send payment proof to confirm transaction.`;
};

module.exports = { get, format };
