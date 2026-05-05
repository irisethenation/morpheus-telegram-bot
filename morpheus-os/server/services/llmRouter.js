'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

// Model tiers — use Sonnet for most agent tasks, Opus for complex reasoning
const MODELS = {
  fast:     'claude-haiku-4-5-20251001',
  standard: 'claude-sonnet-4-6',
  advanced: 'claude-opus-4-7'
};

/**
 * Send a prompt to Claude and return the text response.
 * @param {object} options
 * @param {string} options.system   - System prompt (agent persona)
 * @param {Array}  options.messages - Message array [{role, content}]
 * @param {string} [options.tier]   - 'fast' | 'standard' | 'advanced'
 * @param {number} [options.maxTokens]
 */
async function chat({ system, messages, tier = 'standard', maxTokens = 1024 }) {
  const response = await client.messages.create({
    model:      MODELS[tier] || MODELS.standard,
    max_tokens: maxTokens,
    system,
    messages
  });

  return response.content[0]?.text || '';
}

/**
 * Stream a response — yields text chunks as they arrive.
 */
async function* stream({ system, messages, tier = 'standard', maxTokens = 2048 }) {
  const s = await client.messages.stream({
    model:      MODELS[tier] || MODELS.standard,
    max_tokens: maxTokens,
    system,
    messages
  });

  for await (const chunk of s) {
    if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
      yield chunk.delta.text;
    }
  }
}

module.exports = { chat, stream, MODELS };
