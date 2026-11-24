'use strict';
// Server-only solve provider boundary. The URL and credential are administrator
// configuration, never request data. Gemini remains the default during migration.
const gemini = require('./gemini');

function providerName() {
  // The deployed site answers with its own local model. An operator can still
  // set a cloud provider explicitly, and the server logs that choice at boot.
  return String(process.env.UPAY_SOLVE_PROVIDER || 'local').trim().toLowerCase();
}
function configurationError() {
  const e = new Error('AI provider configuration is invalid'); e.status = 503; return e;
}
function customConfig() {
  const raw = process.env.UPAY_LLM_URL || '';
  const key = process.env.UPAY_LLM_KEY || '';
  const model = process.env.UPAY_LLM_MODEL || '';
  let url;
  try { url = new URL(raw); } catch (_) { throw configurationError(); }
  // Private infrastructure must be exposed through an authenticated HTTPS
  // gateway; no HTTP, userinfo, redirects or browser-controlled destinations.
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !key || !model || model.length > 200) throw configurationError();
  return { url: url.toString(), key, model };
}
async function boundedBody(response, limit) {
  const length = Number(response.headers?.get('content-length') || 0);
  if (length > limit) throw new Error('AI provider response too large');
  if (!response.body || typeof response.body.getReader !== 'function') {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > limit) throw new Error('AI provider response too large');
    return text;
  }
  const reader = response.body.getReader(), chunks = []; let size = 0;
  try {
    while (true) {
      const {value, done} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error('AI provider response too large'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}
async function customText(prompt, options = {}) {
  const {url, key, model} = customConfig();
  const remaining = options.deadline ? options.deadline - Date.now() : 60000;
  if (remaining <= 0 || options.signal?.aborted) { const e = new Error('AI request deadline exceeded'); e.status=504; throw e; }
  const timeout = Math.max(1, Math.min(remaining, options.attemptMs || 60000, 180000));
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, {once:true});
  const timer = setTimeout(cancel, timeout);
  try {
    const response = await fetch(url, {
      method:'POST', redirect:'error', signal:controller.signal,
      headers:{'content-type':'application/json', authorization:'Bearer ' + key},
      body:JSON.stringify({model, messages:[{role:'user',content:String(prompt)}], max_tokens:Math.max(1, Math.min(Number(options.maxOutputTokens) || 6144, 16384)), temperature:0.5, stream:false})
    });
    if (!response.ok) { const e = new Error('AI provider request failed'); e.status=response.status; throw e; }
    let payload;
    try { payload = JSON.parse(await boundedBody(response, 1024 * 1024)); }
    catch (_) { throw new Error('AI provider returned an invalid response'); }
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) throw new Error('AI provider returned an invalid response');
    return {text, model};
  } catch (e) {
    if (controller.signal.aborted) { const timed = new Error('AI request deadline exceeded'); timed.status=504; throw timed; }
    // Never expose or log upstream error text, endpoints, tokens or prompts.
    const sanitized = new Error('AI provider request failed'); sanitized.status = Number(e.status) || 503; throw sanitized;
  } finally {
    clearTimeout(timer); options.signal?.removeEventListener('abort', cancel);
  }
}
/* The site's own model: a local Ollama-compatible server. Cloud providers are
   kept only for an explicit migration override; the shipped default is local. */
async function localText(prompt, options = {}) {
  const llm = require('./local-llm.js');
  const remaining = options.deadline ? options.deadline - Date.now() : 60000;
  if (remaining <= 0 || options.signal?.aborted) { const e = new Error('AI request deadline exceeded'); e.status = 504; throw e; }
  const budget = Math.max(2000, Math.min(remaining, 120000));
  let result;
  try {
    result = await llm.generate({
      messages: [{ role: 'user', content: String(prompt) }],
      maxTokens: Math.max(1, Math.min(Number(options.maxOutputTokens) || 6144, 16384)),
      temperature: 0.5,
      timeoutMs: budget
    });
  } catch (e) {
    const err = new Error('The study model could not answer right now');
    err.status = Number(e && e.status) || 503;
    throw err;
  }
  if (!result.text) { const e = new Error('The study model returned an empty answer'); e.status = 502; throw e; }
  return { text: result.text, model: result.model };
}

async function generateSolve(prompt, keys, preferred, options = {}) {
  const provider = providerName();
  if (provider === 'local' || provider === 'ollama') return localText(prompt, options);
  // Explicit, operator-only override for a staged migration. A request can
  // never reach this branch: the provider name comes from the environment.
  if (provider === 'gemini') return gemini.callGeminiResilient(prompt, keys, preferred, null, options);
  if (provider === 'openai-compatible') return customText(prompt, options);
  throw configurationError();
}
module.exports = {providerName, generateSolve};
