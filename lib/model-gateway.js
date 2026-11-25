'use strict';
/* One model gateway. Every feature that needs an answer from a model calls
 * generate(); nothing else talks to a model server.
 *
 * WHY THIS FILE EXISTS
 *   The site used to have three ways to reach a model: lib/local-llm.js for the
 *   study chat and tutor, the Gemini client in api/ai/solve.js, and a separate
 *   OpenAI-compatible client in lib/ai-provider.js. That made "use my own model
 *   instead of Gemini" a code change in three places. Now it is one variable.
 *
 * CHOOSING THE MODEL (server-side only; a request can never set these)
 *
 *   UPAY_MODEL_PROVIDER=ollama|openai-compatible|gemini|off     (default: ollama)
 *
 *   ollama            A server that speaks Ollama's /api/chat. This is the
 *                     shipped default and what the club GPU runs.
 *     UPAY_LOCAL_LLM_URL    base URL, default http://127.0.0.1:11434
 *     UPAY_LOCAL_LLM_MODEL  model tag, default qwen2.5:3b
 *     UPAY_LOCAL_LLM_KEY    optional bearer token for a private gateway
 *
 *   openai-compatible Anything that speaks POST /v1/chat/completions with
 *                     {"model","messages"} and answers {"choices":[{"message":
 *                     {"content"}}]}. That is vLLM, llama.cpp's server, LM Studio,
 *                     Ollama's own /v1 endpoint, Together, Groq, OpenRouter,
 *                     Fireworks, DeepSeek and friends — and what a model you
 *                     train and serve yourself will speak.
 *     UPAY_LLM_URL          full endpoint URL, must be https:
 *     UPAY_LLM_MODEL        model name the server expects
 *     UPAY_LLM_KEY          bearer token (required; no anonymous endpoints)
 *     UPAY_LLM_HEADERS      optional extra headers, "Name: value" pairs split on
 *                           newlines (e.g. OpenRouter's HTTP-Referer)
 *
 *   gemini            The Google Gemini API, through lib/gemini.js, with key
 *                     rotation. Needs GEMINI_KEYS (or GEMINI_API_KEY).
 *
 *   off               No model. Stored answers and the book's own answer key
 *                     still answer; anything else says so honestly.
 *
 * THE COMPATIBILITY CONTRACT
 *   A model is a drop-in replacement if it accepts this request and returns
 *   this reply. Both are shown in docs/own-model.md, and
 *   tools/check/model_gateway.js starts a fake server that implements exactly
 *   this so the whole app is tested against a model that is not Gemini:
 *
 *     POST /v1/chat/completions
 *     { "model": "...", "messages": [{"role":"system","content":"..."},
 *                                    {"role":"user","content":"..."}],
 *       "temperature": 0.25, "max_tokens": 800, "stream": false }
 *     => 200 { "choices": [ { "message": { "content": "..." } } ] }
 *
 *   Ollama's shape is accepted too ({"message":{"content":"..."}} and
 *   {"response":"..."}), so an Ollama server needs no change.
 *
 * ERRORS
 *   Callers switch on code: llm_unavailable, llm_timeout, llm_model_missing,
 *   llm_configuration, llm_disabled, llm_error, llm_empty. A caller may pass
 *   `codes` to keep its own public vocabulary (the tutor route uses tutor_*).
 *   Upstream error text, endpoints, tokens and prompts are never echoed.
 */
const DEFAULT_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'qwen2.5:3b';
const MAX_OUTPUT = 1024 * 1024;
const PROVIDERS = new Set(['ollama', 'openai-compatible', 'gemini', 'off']);

/* Every error leaves here with a code and an HTTP status the caller can use. */
function errorOf(code, message, status) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  return e;
}
function configError(message) {
  return errorOf('llm_configuration', message || 'The study model is not configured correctly on this server.', 503);
}

function providerName() {
  const raw = String(process.env.UPAY_MODEL_PROVIDER || '').trim().toLowerCase();
  if (raw) {
    if (!PROVIDERS.has(raw)) throw configError('UPAY_MODEL_PROVIDER must be ollama, openai-compatible, gemini or off.');
    return raw;
  }
  /* Backwards compatibility with the two switches that were here before. The
     old names keep working so an existing .env keeps meaning what it meant. */
  const legacy = String(process.env.UPAY_SOLVE_PROVIDER || '').trim().toLowerCase();
  if (legacy === 'gemini') return 'gemini';
  if (legacy === 'openai-compatible') return 'openai-compatible';
  if (legacy === 'local' || legacy === 'ollama') return 'ollama';
  if (legacy === 'off') return 'off';
  if (legacy) return legacy === 'openai' ? 'openai-compatible' : configError('Unknown model provider: ' + legacy);
  return 'ollama';
}

function enabled() {
  if (String(process.env.UPAY_MODEL || process.env.UPAY_LOCAL_LLM || 'on').toLowerCase() === 'off') return false;
  try { return providerName() !== 'off'; } catch (_) { return false; }
}

/* ------------------------------------------------------------ ollama ----- */
function ollamaBase() {
  const raw = String(process.env.UPAY_LOCAL_LLM_URL || process.env.UPAY_OLLAMA_URL || DEFAULT_URL).trim();
  let parsed;
  try { parsed = new URL(raw); } catch (_) { throw configError(); }
  if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw configError();
  return parsed.toString().replace(/\/$/, '');
}
function ollamaModel() {
  const raw = String(process.env.UPAY_LOCAL_LLM_MODEL || process.env.UPAY_OLLAMA_MODEL || DEFAULT_MODEL).trim();
  if (!/^[A-Za-z0-9._:\/-]{1,80}$/.test(raw)) throw configError();
  return raw;
}

/* ------------------------------------------------ openai-compatible ----- */
function compatibleConfig() {
  const raw = String(process.env.UPAY_LLM_URL || '').trim();
  const key = String(process.env.UPAY_LLM_KEY || '').trim();
  const model = String(process.env.UPAY_LLM_MODEL || '').trim();
  let url;
  try { url = new URL(raw); } catch (_) { throw configError('UPAY_LLM_URL is not a valid URL.'); }
  /* A model on this machine is reached over plain HTTP, which is how every
     local server (vLLM, llama.cpp, LM Studio, Ollama's /v1) listens, and there
     is no token to expose on a loopback socket, so the key is optional there.
     Anything that is not loopback is a network hop: it must be an authenticated
     HTTPS endpoint, with no credentials in the URL, no query and no fragment. */
  const loopback = /^(127\.\d+\.\d+\.\d+|::1|localhost)$/i.test(url.hostname);
  const protocolOk = url.protocol === 'https:' || (loopback && url.protocol === 'http:');
  if (!protocolOk || url.username || url.password || url.search || url.hash) {
    throw configError(loopback
      ? 'UPAY_LLM_URL must be a plain http://127.0.0.1 or https:// endpoint with no credentials in it.'
      : 'UPAY_LLM_URL must be a plain https:// endpoint with no credentials in it.');
  }
  if (!key && !loopback) throw configError('UPAY_LLM_KEY is required for a non-local endpoint: an anonymous public endpoint is not accepted.');
  if (!model || model.length > 200) throw configError('UPAY_LLM_MODEL is required.');
  const extra = {};
  for (const line of String(process.env.UPAY_LLM_HEADERS || '').split(/\n+/)) {
    const at = line.indexOf(':');
    if (at < 1) continue;
    const name = line.slice(0, at).trim();
    const value = line.slice(at + 1).trim();
    if (!/^[A-Za-z0-9-]{1,64}$/.test(name)) throw configError('UPAY_LLM_HEADERS has an invalid header name.');
    if (value) extra[name] = value;
  }
  return { url: url.toString(), key, model, extra };
}

/* ---------------------------------------------------------- helpers ----- */
function maxOutput(options) {
  return Math.max(1, Math.min(Number(options.maxOutputTokens) || 6144, 16384));
}
/* One abort controller per request: deadline, per-attempt timeout and the
   caller's own signal all cancel the same fetch. */
function attempt({ deadline, attemptMs, signal }) {
  /* An already-cancelled caller or an expired budget is a timeout before any
     socket exists: it must not be reported as "not reachable". */
  if (signal && signal.aborted) throw errorOf('llm_timeout', 'The study model took too long to answer.', 504);
  const remaining = deadline ? deadline - Date.now() : 60000;
  if (remaining <= 0) throw errorOf('llm_timeout', 'The study model took too long to answer.', 504);
  const timeout = Math.max(1, Math.min(remaining, attemptMs || 60000, 180000));
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal) signal.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, timeout);
  return {
    signal: controller.signal,
    aborted: () => controller.signal.aborted,
    release() {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', cancel);
    }
  };
}

/* Read a JSON body without trusting its length. A model server is not allowed
   to make this process hold an unbounded string. */
async function boundedJson(response, limit) {
  const length = Number(response.headers && response.headers.get && response.headers.get('content-length') || 0);
  if (length > limit) throw errorOf('llm_error', 'The study model returned too much data.', 502);
  if (!response.body || typeof response.body.getReader !== 'function') {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > limit) throw errorOf('llm_error', 'The study model returned too much data.', 502);
    return JSON.parse(text);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw errorOf('llm_error', 'The study model returned too much data.', 502); }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/* The reply shapes a compatible endpoint may return. All three are in the wild:
   OpenAI/vLLM/llama.cpp, Ollama's /api/chat, and Ollama's older /api/generate. */
function textOf(payload) {
  const candidates = [
    payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content,
    payload && payload.choices && payload.choices[0] && payload.choices[0].text,
    payload && payload.message && payload.message.content,
    payload && payload.response
  ];
  for (const value of candidates) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

function mapFailure(e, codes) {
  if (!e || !e.code) return e;
  const map = {
    llm_unavailable: 'tutor_unavailable', llm_timeout: 'tutor_timeout',
    llm_model_missing: 'tutor_model_missing', llm_error: 'tutor_model_error',
    llm_configuration: 'tutor_configuration', llm_disabled: 'tutor_disabled'
  };
  if (!codes || !map[e.code]) return e;
  e.code = codes[map[e.code]] || map[e.code];
  if (e.code === 'tutor_unavailable') e.message = 'The local Science model is not reachable from this server.';
  if (e.code === 'tutor_timeout') e.message = 'The local Science model took too long to answer.';
  if (e.code === 'tutor_model_missing') e.message = 'The configured model tag is not installed on the model server.';
  return e;
}

/* --------------------------------------------------------- providers ---- */
async function callHttp({ url, headers, body, signal, release, providerModel }) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST', redirect: 'error', signal, headers,
      body: JSON.stringify(body)
    });
  } catch (e) {
    /* Our own abort is a timeout whatever the runtime calls it; a mock or a
       proxy may reject with its own error, so check the signal too. */
    if ((e && (e.name === 'AbortError' || e.name === 'TimeoutError')) || (signal && signal.aborted)) {
      throw errorOf('llm_timeout', 'The study model took too long to answer.', 504);
    }
    throw errorOf('llm_unavailable', 'The study model is not reachable from this server.', 503);
  } finally {
    release();
  }
  if (!response.ok) {
    if (response.status === 404) {
      throw errorOf('llm_model_missing', 'The configured model tag is not installed on the model server.', 503);
    }
    /* A rate limit is the caller's business: it is worth retrying, and the
       solve route turns it into its own "try again" message. Every other
       upstream status is reported as a bad gateway, never as a client error,
       so a model problem can never look like the student's mistake. The
       upstream text is never read or echoed. */
    if (response.status === 429) {
      throw errorOf('llm_rate_limited', 'The study model is busy right now. Try again in a moment.', 429);
    }
    throw errorOf('llm_error', 'The study model rejected the request.', response.status >= 500 ? 502 : 503);
  }
  let payload;
  try { payload = await boundedJson(response, MAX_OUTPUT); }
  catch (e) {
    if (e && e.code) throw e;
    throw errorOf('llm_error', 'The study model returned an unreadable response.', 502);
  }
  return { text: textOf(payload), model: providerModel };
}

async function callOllama({ messages, model, temperature, maxTokens, numCtx, deadline, signal, attemptMs }) {
  const base = ollamaBase();
  const tag = model || ollamaModel();
  const a = attempt({ deadline, attemptMs, signal });
  const headers = { 'content-type': 'application/json' };
  const key = String(process.env.UPAY_LOCAL_LLM_KEY || '').trim();
  if (key) headers.authorization = 'Bearer ' + key;
  return callHttp({
    url: base + '/api/chat',
    headers,
    body: {
      model: tag, messages, stream: false,
      options: { temperature: temperature == null ? 0.2 : temperature, num_ctx: numCtx || 4096, num_predict: maxTokens || 700 }
    },
    signal: a.signal, release: a.release, providerModel: tag
  });
}

async function callCompatible({ messages, model, temperature, maxTokens, deadline, signal, attemptMs, options }) {
  const config = compatibleConfig();
  const a = attempt({ deadline, attemptMs, signal });
  return callHttp({
    url: config.url,
    headers: Object.assign({ 'content-type': 'application/json' },
      config.key ? { authorization: 'Bearer ' + config.key } : {}, config.extra),
    body: {
      model: model || config.model,
      messages,
      max_tokens: maxTokens || maxOutput(options),
      temperature: temperature == null ? 0.2 : temperature,
      stream: false
    },
    signal: a.signal, release: a.release, providerModel: model || config.model
  });
}

async function callGemini({ messages, callOptions, keys, preferred }) {
  /* Gemini takes one prompt, not a message list. The messages are joined in
     order, so the system message stays first — which is what the previous
     implementation did — and the caller's options object is passed through
     untouched (deadline, signal, attemptMs, maxOutputTokens). */
  const prompt = messages.map(m => String((m && m.content) || '')).join('\n\n');
  const gemini = require('./gemini.js');
  /* `keys` is the self-hosted server's own key ring (db.settings.geminiKeys);
     with no ring, lib/gemini.js falls back to GEMINI_KEYS in the environment.
     Either way the credential is server configuration, never request data. */
  const result = await gemini.callGeminiResilient(prompt, keys, preferred, null, callOptions);
  return { text: String((result && result.text) || '').trim(), model: (result && result.model) || 'gemini' };
}

/* ------------------------------------------------------------ public ---- */
async function generate({ messages, model, temperature, maxTokens, numCtx, timeoutMs, codes, deadline, signal, callOptions: forwarded, geminiKeys, geminiModel } = {}) {
  if (!Array.isArray(messages) || !messages.length) {
    throw errorOf('empty_prompt', 'Nothing to answer.', 400);
  }
  let provider;
  try { provider = providerName(); } catch (e) { throw mapFailure(e, codes); }
  if (provider === 'off' || !enabled()) {
    throw mapFailure(errorOf('llm_disabled', 'The study model is switched off by the administrator.', 503), codes);
  }
  /* The solve route hands its draft and its repair call the SAME options
     object, so that a repair can never outlive the budget it was given. That
     identity is part of the contract (tools/check/serverless_smoke.js asserts
     it), so the object a caller passes is forwarded as-is rather than rebuilt. */
  const callOptions = forwarded || {};
  try {
    let result;
    if (provider === 'ollama') result = await callOllama({ messages, model, temperature, maxTokens, numCtx, deadline, signal, attemptMs: timeoutMs });
    else if (provider === 'openai-compatible') result = await callCompatible({ messages, model, temperature, maxTokens, deadline, signal, attemptMs: timeoutMs, options: callOptions });
    /* Explicit, never a fall-through: a misspelt provider must not quietly
       become a cloud call. providerName() validates, and this is the second
       gate in case a future edit adds a name there and not here. */
    else if (provider === 'gemini') result = await callGemini({ messages, callOptions, keys: geminiKeys, preferred: geminiModel });
    else throw configError('Unknown model provider: ' + provider);
    if (!result.text) throw errorOf('llm_empty', 'The study model returned an empty answer.', 502);
    return result;
  } catch (e) {
    throw mapFailure(e, codes);
  }
}

/* Student-facing status. Never exposes the host, the key or the token. */
function status() {
  let provider = 'ollama';
  let ok = true;
  let model = DEFAULT_MODEL;
  try {
    provider = providerName();
    if (provider === 'ollama') model = ollamaModel();
    else if (provider === 'openai-compatible') model = compatibleConfig().model;
    else if (provider === 'gemini') model = String(process.env.GEMINI_MODEL || 'gemini').trim();
    else { ok = false; model = 'off'; }
    if (!enabled()) ok = false;
  } catch (_) { ok = false; }
  return {
    enabled: ok,
    model,
    host: provider === 'gemini' ? 'cloud' : 'local',
    provider,
    note: provider === 'gemini'
      ? 'Answers come from the configured cloud model.'
      : 'Answers come from the site\u2019s own model; questions stay on the server.'
  };
}

/* Names from the previous boundary, re-exported so older callers and the
   checks that pin them keep working. providerGuard() is now a plain question:
   the gateway itself decides who may answer. */
function providerGuard() {
  if (!enabled()) throw errorOf('cloud_provider_disabled', 'No model provider is enabled on this server.', 503);
  return true;
}
function baseUrl() {
  const provider = providerName();
  if (provider === 'ollama') return ollamaBase();
  if (provider === 'openai-compatible') return compatibleConfig().url;
  throw configError('The configured provider is not reached over a base URL.');
}
function modelName() {
  const provider = providerName();
  if (provider === 'ollama') return ollamaModel();
  if (provider === 'openai-compatible') return compatibleConfig().model;
  if (provider === 'gemini') return String(process.env.GEMINI_MODEL || 'gemini').trim();
  return 'off';
}

module.exports = {
  DEFAULT_URL, DEFAULT_MODEL, PROVIDERS,
  generate, status, errorOf, configError,
  providerName, enabled, providerGuard, baseUrl, modelName,
  /* exposed for the checks, not for feature code */
  textOf, compatibleConfig, ollamaBase, ollamaModel
};
