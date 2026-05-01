const BASE = process.env.GEM_AGENCY_URL || 'https://gemtheagency.com';

const PRICING = {
  activation: { min: 300, max: 500, label: 'Website Activation' },
  automation: { min: 500, max: 1000, label: 'Lead Automation Add-on' },
  crm: { min: 300, max: 500, label: 'CRM Integration' },
  bundle: { min: 1000, max: 2000, label: 'Full Stack Bundle' }
};

const NICHES = [
  'Restaurants & Cafés', 'Plumbers', 'Electricians', 'Estate Agents',
  'Solicitors', 'Dentists', 'Gyms & PTs', 'Beauty Salons',
  'Accountants', 'Mortgage Brokers', 'Letting Agents', 'Builders'
];

const toSlug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const previewUrl = name => `${BASE}/preview/${toSlug(name)}`;

const buildOffer = name => ({
  previewUrl: previewUrl(name),
  activation: `£${PRICING.activation.min}–£${PRICING.activation.max}`,
  automation: `£${PRICING.automation.min}–£${PRICING.automation.max}`,
  bundle: `£${PRICING.bundle.min}–£${PRICING.bundle.max}`
});

module.exports = { PRICING, NICHES, previewUrl, buildOffer };
