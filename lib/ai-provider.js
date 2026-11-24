'use strict';
// Server-only solve provider boundary. Every model call goes through
// lib/model-gateway.js, so this file only adapts the solve route's inputs. The
// provider, URL and credential are administrator configuration, never request
// data; see that file for UPAY_MODEL_PROVIDER and the endpoints it accepts.
const gateway = require('./model-gateway.js');

function providerName() {
  return gateway.providerName();
}

/* The old signature is kept: (prompt, keys, preferred, options). `keys` and
   `preferred` were Gemini's key-ring and preferred key; the gateway owns key
   rotation now, so they are ignored. Callers do not change. */
async function generateSolve(prompt, keys, preferred, options = {}) {
  const messages = Array.isArray(prompt)
    ? prompt
    : [{ role: 'user', content: String(prompt) }];
  return gateway.generate({
    messages,
    deadline: options.deadline,
    signal: options.signal,
    maxTokens: options.maxOutputTokens,
    timeoutMs: options.attemptMs,
    /* Forwarded, not copied: a repair call shares its draft's budget. */
    callOptions: options,
    /* The self-hosted server keeps the Gemini ring in its own store. Passing it
       keeps that install working; the hosted one reads GEMINI_KEYS instead. */
    geminiKeys: keys,
    geminiModel: preferred
  });
}

module.exports = { providerName, generateSolve };
