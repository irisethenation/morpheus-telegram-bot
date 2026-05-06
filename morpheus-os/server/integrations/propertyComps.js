'use strict';

const axios = require('axios');
const env   = require('../config/env');

const BASE_URL = 'https://api.propertydata.co.uk';

function params(extra = {}) {
  return { key: env.propertyComps.apiKey, ...extra };
}

/**
 * Get comparable sold prices for a postcode.
 */
async function getSoldComps(postcode, { beds, propertyType = 'detached' } = {}) {
  const response = await axios.get(`${BASE_URL}/sold-prices`, {
    params: params({ postcode, beds, property_type: propertyType })
  });
  return response.data;
}

/**
 * Get current listing prices for a postcode.
 */
async function getListingPrices(postcode, { beds, propertyType } = {}) {
  const response = await axios.get(`${BASE_URL}/prices`, {
    params: params({ postcode, beds, property_type: propertyType })
  });
  return response.data;
}

/**
 * Get rental yield data.
 */
async function getRentalYield(postcode, { beds } = {}) {
  const response = await axios.get(`${BASE_URL}/yields`, {
    params: params({ postcode, beds })
  });
  return response.data;
}

/**
 * Full property analysis — comps + yield + listings in one call.
 */
async function fullAnalysis(postcode, options = {}) {
  const [sold, listings, yields] = await Promise.allSettled([
    getSoldComps(postcode, options),
    getListingPrices(postcode, options),
    getRentalYield(postcode, options)
  ]);

  return {
    postcode,
    sold_comps:   sold.status    === 'fulfilled' ? sold.value    : null,
    listings:     listings.status === 'fulfilled' ? listings.value : null,
    rental_yield: yields.status  === 'fulfilled' ? yields.value  : null,
    generated_at: new Date().toISOString()
  };
}

/**
 * Quick BMV (below market value) assessment.
 * Returns estimated discount % compared to average sold price.
 */
async function assessBMV(postcode, askingPrice, options = {}) {
  const comps = await getSoldComps(postcode, options);
  const avgSold = comps?.data?.average_sold_price;

  if (!avgSold) return null;

  const discount = ((avgSold - askingPrice) / avgSold) * 100;
  return {
    asking_price:    askingPrice,
    avg_sold_price:  avgSold,
    discount_pct:    parseFloat(discount.toFixed(2)),
    is_bmv:          discount >= 15,
    assessment:      discount >= 25 ? 'excellent' : discount >= 15 ? 'good' : 'at_market'
  };
}

module.exports = { getSoldComps, getListingPrices, getRentalYield, fullAnalysis, assessBMV };
