'use strict';

const axios = require('axios');
const env   = require('../config/env');

const BASE_URL = 'https://api.brevo.com/v3';

function headers() {
  return {
    'api-key':      env.brevo.apiKey,
    'Content-Type': 'application/json'
  };
}

// ─── Contacts ────────────────────────────────────────────────────────
async function upsertContact({ email, firstName, lastName, phone, listIds = [], attributes = {} }) {
  await axios.post(`${BASE_URL}/contacts`, {
    email,
    attributes: {
      FIRSTNAME: firstName,
      LASTNAME:  lastName || '',
      SMS:       phone    || '',
      ...attributes
    },
    listIds,
    updateEnabled: true
  }, { headers: headers() });
}

async function addToList(email, listId) {
  await axios.post(`${BASE_URL}/contacts/lists/${listId}/contacts/add`, {
    emails: [email]
  }, { headers: headers() });
}

// ─── Transactional emails ─────────────────────────────────────────────
async function sendTransactional({ to, subject, htmlContent, params = {}, templateId = null }) {
  const payload = {
    to: [{ email: to.email, name: to.name || '' }],
    params
  };

  if (templateId) {
    payload.templateId = templateId;
  } else {
    payload.subject     = subject;
    payload.htmlContent = htmlContent;
    payload.sender      = { name: 'iRise Nation', email: env.brevo.fromEmail };
  }

  const response = await axios.post(`${BASE_URL}/smtp/email`, payload, { headers: headers() });
  return response.data;
}

// ─── Pre-built transactional triggers ────────────────────────────────
async function sendWelcome({ email, firstName }) {
  return sendTransactional({
    to:          { email, name: firstName },
    templateId:  env.brevo.templates?.welcome,
    subject:     'Peace and Balance — Welcome to iRise Nation',
    htmlContent: `<p>Peace and Balance, ${firstName}.</p>
<p>Welcome to iRise Nation. Your sovereign journey begins now.</p>
<p>Explore what Morpheus has for you via Telegram: @MorpheusiRise_bot</p>`,
    params: { FIRSTNAME: firstName }
  });
}

async function sendIntakeConfirmation({ email, firstName }) {
  return sendTransactional({
    to:          { email, name: firstName },
    templateId:  env.brevo.templates?.intakeConfirmation,
    subject:     'Trust Intake Received — iRise Nation',
    htmlContent: `<p>${firstName}, your trust intake has been received.</p>
<p>Trinity will review your responses and prepare your trust structure recommendation within 48 hours.</p>`,
    params: { FIRSTNAME: firstName }
  });
}

async function sendPaymentConfirmation({ email, firstName, productName, amountGbp, invoiceUrl }) {
  return sendTransactional({
    to:          { email, name: firstName },
    templateId:  env.brevo.templates?.paymentConfirmation,
    subject:     `Payment Confirmed — ${productName}`,
    htmlContent: `<p>${firstName}, your payment of £${amountGbp} for <strong>${productName}</strong> has been confirmed.</p>
${invoiceUrl ? `<p><a href="${invoiceUrl}">Download your invoice</a></p>` : ''}
<p>Your next steps will follow shortly from your assigned agent.</p>`,
    params: { FIRSTNAME: firstName, PRODUCT: productName, AMOUNT: amountGbp }
  });
}

async function sendEnrollmentAccess({ email, firstName, courseName, portalUrl }) {
  return sendTransactional({
    to:          { email, name: firstName },
    templateId:  env.brevo.templates?.enrollmentAccess,
    subject:     `Academy Access Granted — ${courseName}`,
    htmlContent: `<p>${firstName}, your enrollment in <strong>${courseName}</strong> is confirmed.</p>
<p><a href="${portalUrl || 'https://academy.irise.nation'}">Access your course portal here</a></p>`,
    params: { FIRSTNAME: firstName, COURSE: courseName }
  });
}

async function sendFollowUp({ email, firstName, context }) {
  return sendTransactional({
    to:          { email, name: firstName },
    templateId:  env.brevo.templates?.followUp,
    subject:     'Following Up — iRise Nation',
    htmlContent: `<p>Peace, ${firstName}.</p>
<p>${context || "We wanted to check in and see how you're progressing on your sovereign journey."}</p>
<p>Reply to this email or message Morpheus directly: @MorpheusiRise_bot</p>`,
    params: { FIRSTNAME: firstName }
  });
}

async function sendUpsellOffer({ email, firstName, offerName, offerDescription, offerUrl }) {
  return sendTransactional({
    to:          { email, name: firstName },
    templateId:  env.brevo.templates?.upsell,
    subject:     `Exclusive Offer for You — ${offerName}`,
    htmlContent: `<p>${firstName}, based on your journey with iRise Nation, we have a sovereign opportunity for you.</p>
<p><strong>${offerName}</strong></p>
<p>${offerDescription}</p>
${offerUrl ? `<p><a href="${offerUrl}">Learn more</a></p>` : ''}`,
    params: { FIRSTNAME: firstName, OFFER: offerName }
  });
}

// ─── Drip sequence enrolment ──────────────────────────────────────────
async function enrolInSequence(email, sequenceId) {
  // Brevo refers to these as "workflows" or automation triggers
  await axios.post(`${BASE_URL}/contacts/doubleoptinconfirmation`, {
    email, attributes: {}, includeListIds: [], templateId: sequenceId,
    redirectionUrl: env.origins?.wepayCash || 'https://wepaycash.co.uk'
  }, { headers: headers() }).catch(() => null); // silent fail if not configured
}

module.exports = {
  upsertContact, addToList,
  sendTransactional,
  sendWelcome, sendIntakeConfirmation, sendPaymentConfirmation,
  sendEnrollmentAccess, sendFollowUp, sendUpsellOffer,
  enrolInSequence
};
