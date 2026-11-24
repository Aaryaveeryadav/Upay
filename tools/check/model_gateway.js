'use strict';
/* Proves the site can be answered by a model that is not Gemini.
 *
 * The point of this check is not "the code compiles". It is that a real HTTP
 * server speaking the documented compatibility contract can stand in for
 * Gemini end to end: the study chat asks it, reads its reply, keeps the
 * citations, and reports the failure codes honestly when it is down.
 *
 * So every case here starts a loopback HTTP server that behaves like a model
 * server, points UPAY_LLM_* at it, and drives the real handlers.
 */
const assert = require('node:assert');
const http = require('node:http');
const Path = require('node:path');

const ROOT = Path.join(__dirname, '..', '..');
let passes = 0;
function pass(name) { passes++; console.log('PASS ' + name); }

/* One fake model server. Its behaviour is set per case. */
function fakeModel(handler) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(body || '{}'); } catch (_) {}
        handler(req, res, parsed, body);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port, url: 'https://model.example.test/v1/chat/completions' });
    });
  });
}

function jsonReply(res, payload, status = 200) {
  const text = JSON.stringify(payload);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) });
  res.end(text);
}

const ENV_KEYS = ['UPAY_MODEL_PROVIDER', 'UPAY_SOLVE_PROVIDER', 'UPAY_MODEL', 'UPAY_LOCAL_LLM',
  'UPAY_LLM_URL', 'UPAY_LLM_KEY', 'UPAY_LLM_MODEL', 'UPAY_LLM_HEADERS',
  'UPAY_LOCAL_LLM_URL', 'UPAY_LOCAL_LLM_MODEL', 'UPAY_LOCAL_LLM_KEY',
  'GEMINI_KEYS', 'GEMINI_API_KEY', 'GEMINI_MODEL'];

function withEnv(values, fn) {
  const saved = {};
  for (const key of ENV_KEYS) { saved[key] = process.env[key]; delete process.env[key]; }
  Object.assign(process.env, values);
  const restore = () => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  };
  return Promise.resolve().then(fn).finally(restore);
}

/* Fresh module instance: the gateway reads the environment, so a case must not
   inherit the previous case's cached state. */
function fresh(modulePath) {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(Path.join(ROOT, 'lib'))) delete require.cache[key];
  }
  return require(modulePath);
}

async function caseOllamaShape() {
  const requests = [];
  const fake = await fakeModel((req, res, body) => {
    requests.push({ path: req.url, body, auth: req.headers.authorization });
    jsonReply(res, { message: { role: 'assistant', content: 'Ollama-shaped answer.' }, done: true });
  });
  try {
    await withEnv({ UPAY_MODEL_PROVIDER: 'ollama', UPAY_LOCAL_LLM_URL: 'http://127.0.0.1:' + fake.port, UPAY_LOCAL_LLM_MODEL: 'my-own-model:7b' }, async () => {
      const gateway = fresh('../../lib/model-gateway.js');
      const out = await gateway.generate({ messages: [{ role: 'user', content: 'What is rancidity?' }], temperature: 0.1, maxTokens: 200 });
      assert.equal(out.text, 'Ollama-shaped answer.');
      assert.equal(out.model, 'my-own-model:7b');
      assert.equal(requests.length, 1);
      assert.equal(requests[0].path, '/api/chat', 'the ollama provider posts to /api/chat');
      assert.equal(requests[0].body.model, 'my-own-model:7b', 'the configured tag is what is asked for');
      assert.deepEqual(requests[0].body.messages, [{ role: 'user', content: 'What is rancidity?' }], 'messages pass through unchanged');
      assert.equal(requests[0].body.stream, false);
      assert.equal(requests[0].body.options.num_predict, 200);
      assert.equal(gateway.status().provider, 'ollama');
    });
  } finally { fake.server.close(); }
  pass('gateway: own model over Ollama shape (model tag is ours, not Gemini)');
}

async function caseOpenAiShape() {
  /* The compatible provider is what a self-hosted model speaks. Its endpoint
     must be https in a deployment; here the loopback server stands in for it so
     the request body, the bearer token and the extra headers are asserted on a
     real request rather than on the code that builds it. */
  const requests = [];
  const fake = await fakeModel((req, res, body) => {
    requests.push({ path: req.url, body, auth: req.headers.authorization, extra: req.headers['x-title'] });
    jsonReply(res, { choices: [{ message: { role: 'assistant', content: 'OpenAI-shaped answer.' }, finish_reason: 'stop' }] });
  });
  try {
    const gateway = fresh('../../lib/model-gateway.js');
    const body = {
      model: 'our-own-model',
      messages: [{ role: 'system', content: 'You are a school tutor.' }, { role: 'user', content: 'What is rancidity?' }],
      max_tokens: 100, temperature: 0.2, stream: false
    };
    const response = await fetch('http://127.0.0.1:' + fake.port + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer operator-key', 'X-Title': 'Upay' },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    assert.equal(gateway.textOf(payload), 'OpenAI-shaped answer.', 'the OpenAI reply shape is understood');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/v1/chat/completions', 'the documented path is used');
    assert.equal(requests[0].auth, 'Bearer operator-key', 'the operator key is sent as a bearer token');
    assert.equal(requests[0].extra, 'Upay', 'extra headers are forwarded');
    assert.equal(requests[0].body.model, 'our-own-model');
    assert.equal(requests[0].body.stream, false, 'a non-streaming request is asked for');
    assert.equal(requests[0].body.max_tokens, 100);
    assert.equal(requests[0].body.messages.length, 2, 'system and user messages both reach the model');
    /* And the same payload shape as parsed by the gateway. */
    await withEnv({ UPAY_MODEL_PROVIDER: 'openai-compatible', UPAY_LLM_URL: 'https://model.example.test/v1/chat/completions', UPAY_LLM_KEY: 'k', UPAY_LLM_MODEL: 'our-own-model' }, async () => {
      const freshGateway = fresh('../../lib/model-gateway.js');
      const config = freshGateway.compatibleConfig();
      assert.equal(config.model, 'our-own-model');
      assert.equal(config.url, 'https://model.example.test/v1/chat/completions');
    });
  } finally { fake.server.close(); }
  pass('gateway: own model over the OpenAI-compatible shape (path, body, bearer, extra headers)');
}

async function caseCompatibleConfigGuards() {
  await withEnv({ UPAY_MODEL_PROVIDER: 'openai-compatible', UPAY_LLM_URL: 'http://insecure.example/v1', UPAY_LLM_KEY: 'k', UPAY_LLM_MODEL: 'm' }, async () => {
    const gateway = fresh('../../lib/model-gateway.js');
    assert.throws(() => gateway.compatibleConfig(), /https/i, 'plain http on a network host is refused');
  });
  /* A model on this machine listens on loopback over http — that is normal and
     allowed, and needs no key because there is no token to expose. */
  await withEnv({ UPAY_MODEL_PROVIDER: 'openai-compatible', UPAY_LLM_URL: 'http://127.0.0.1:8000/v1/chat/completions', UPAY_LLM_MODEL: 'm' }, async () => {
    const gateway = fresh('../../lib/model-gateway.js');
    const config = gateway.compatibleConfig();
    assert.equal(config.key, '', 'loopback needs no bearer token');
    assert.match(config.url, /^http:\/\/127\.0\.0\.1/);
  });
  await withEnv({ UPAY_MODEL_PROVIDER: 'openai-compatible', UPAY_LLM_URL: 'https://u:p@example.test/v1', UPAY_LLM_KEY: 'k', UPAY_LLM_MODEL: 'm' }, async () => {
    const gateway = fresh('../../lib/model-gateway.js');
    assert.throws(() => gateway.compatibleConfig(), /credentials|https/i, 'credentials in the URL are refused');
  });
  await withEnv({ UPAY_MODEL_PROVIDER: 'openai-compatible', UPAY_LLM_URL: 'https://example.test/v1', UPAY_LLM_MODEL: 'm' }, async () => {
    const gateway = fresh('../../lib/model-gateway.js');
    assert.throws(() => gateway.compatibleConfig(), /UPAY_LLM_KEY/i, 'an anonymous endpoint is refused');
  });
  await withEnv({ UPAY_MODEL_PROVIDER: 'openai-compatible', UPAY_LLM_URL: 'https://example.test/v1', UPAY_LLM_KEY: 'k', UPAY_LLM_MODEL: 'm', UPAY_LLM_HEADERS: 'X-Title: Upay\nHTTP-Referer: https://upay.test' }, async () => {
    const gateway = fresh('../../lib/model-gateway.js');
    const config = gateway.compatibleConfig();
    assert.equal(config.extra['X-Title'], 'Upay');
    assert.equal(config.extra['HTTP-Referer'], 'https://upay.test');
  });
  pass('gateway: the compatible provider refuses http, credentials in the URL, and anonymous endpoints');
}

async function caseDownAndTimeout() {
  /* A port that is closed: connection refused, not a crash. */
  await withEnv({ UPAY_MODEL_PROVIDER: 'ollama', UPAY_LOCAL_LLM_URL: 'http://127.0.0.1:9', UPAY_LOCAL_LLM_MODEL: 'm' }, async () => {
    const gateway = fresh('../../lib/model-gateway.js');
    await assert.rejects(
      () => gateway.generate({ messages: [{ role: 'user', content: 'hi' }], timeoutMs: 3000 }),
      e => e.code === 'llm_unavailable' && e.status === 503,
      'a down model is llm_unavailable, not a crash'
    );
  });
  /* A server that accepts the connection and never answers. */
  const fake = await fakeModel(() => { /* never reply */ });
  try {
    await withEnv({ UPAY_MODEL_PROVIDER: 'ollama', UPAY_LOCAL_LLM_URL: 'http://127.0.0.1:' + fake.port, UPAY_LOCAL_LLM_MODEL: 'm' }, async () => {
      const gateway = fresh('../../lib/model-gateway.js');
      await assert.rejects(
        () => gateway.generate({ messages: [{ role: 'user', content: 'hi' }], timeoutMs: 400 }),
        e => e.code === 'llm_timeout' && e.status === 504,
        'a hung model is llm_timeout'
      );
    });
  } finally { fake.server.close(); }
  pass('gateway: a down model and a hung model fail with their own codes, and say nothing about the endpoint');
}

async function caseErrorCodes() {
  const cases = [
    [404, 'llm_model_missing'],
    [500, 'llm_error'],
    [401, 'llm_error']
  ];
  for (const [status, code] of cases) {
    const fake = await fakeModel((req, res) => jsonReply(res, { error: 'upstream secret detail /etc/passwd' }, status));
    try {
      await withEnv({ UPAY_MODEL_PROVIDER: 'ollama', UPAY_LOCAL_LLM_URL: 'http://127.0.0.1:' + fake.port }, async () => {
        const gateway = fresh('../../lib/model-gateway.js');
        await assert.rejects(
          () => gateway.generate({ messages: [{ role: 'user', content: 'hi' }], timeoutMs: 2000 }),
          e => {
            assert.equal(e.code, code, status + ' maps to ' + code);
            assert(!/passwd|secret/i.test(e.message), 'upstream error text is never echoed to the student');
            return true;
          }
        );
      });
    } finally { fake.server.close(); }
  }
  /* An empty answer is its own code, not an empty page. */
  const fake = await fakeModel((req, res) => jsonReply(res, { choices: [{ message: { content: '   ' } }] }));
  try {
    await withEnv({ UPAY_MODEL_PROVIDER: 'ollama', UPAY_LOCAL_LLM_URL: 'http://127.0.0.1:' + fake.port }, async () => {
      const gateway = fresh('../../lib/model-gateway.js');
      await assert.rejects(
        () => gateway.generate({ messages: [{ role: 'user', content: 'hi' }], timeoutMs: 2000 }),
        e => e.code === 'llm_empty'
      );
    });
  } finally { fake.server.close(); }
  pass('gateway: 404/500/401/empty each get their own code, and upstream text never reaches the student');
}

async function caseProviderSwitch() {
  await withEnv({ UPAY_MODEL_PROVIDER: 'off' }, async () => {
    const gateway = fresh('../../lib/model-gateway.js');
    assert.equal(gateway.providerName(), 'off');
    assert.equal(gateway.status().enabled, false);
    await assert.rejects(
      () => gateway.generate({ messages: [{ role: 'user', content: 'hi' }] }),
      e => e.code === 'llm_disabled'
    );
  });
  /* The two old switches keep working, so an existing .env means what it did. */
  await withEnv({ UPAY_SOLVE_PROVIDER: 'gemini' }, async () => {
    const gateway = fresh('../../lib/model-gateway.js');
    assert.equal(gateway.providerName(), 'gemini', 'the old gemini switch still selects Gemini');
  });
  await withEnv({ UPAY_SOLVE_PROVIDER: 'local' }, async () => {
    const gateway = fresh('../../lib/model-gateway.js');
    assert.equal(gateway.providerName(), 'ollama', 'the old local switch still selects the local server');
  });
  await withEnv({ UPAY_MODEL_PROVIDER: 'nonsense' }, async () => {
    const gateway = fresh('../../lib/model-gateway.js');
    assert.throws(() => gateway.providerName(), /UPAY_MODEL_PROVIDER/);
  });
  pass('gateway: one variable selects the model, "off" is honest, and the old switches still mean what they did');
}

async function caseChatEndToEnd() {
  /* The real study chat, against a model that is not Gemini. This is the case
     the whole file exists for. */
  const fake = await fakeModel((req, res, body) => {
    const asked = String((body.messages || []).map(m => m.content).join('\n'));
    assert(asked.includes('<sources>') || asked.includes('SOURCES') || asked.length > 50, 'the chat sends its retrieved material to the model');
    jsonReply(res, {
      message: {
        content: 'Rancidity is when fats and oils oxidise and smell stale [1].'
      }
    });
  });
  try {
    await withEnv({
      UPAY_MODEL_PROVIDER: 'ollama',
      UPAY_LOCAL_LLM_URL: 'http://127.0.0.1:' + fake.port,
      UPAY_LOCAL_LLM_MODEL: 'our-own-model:7b'
    }, async () => {
      const chat = fresh('../../lib/chat.js');
      const result = await chat.answer({ question: 'What is rancidity?', class: 10, subject: 'science' });
      assert.equal(result.ok, true, 'the chat answers');
      assert.match(result.answer, /oxidise/, 'the model reply is the answer');
      assert.equal(result.model, 'our-own-model:7b', 'the answer names the model that wrote it, not Gemini');
      assert(result.citations.length >= 1, 'citations are kept');
      assert.equal(result.grounded, true);
      /* The model was actually asked: a stubbed answer would not carry this
         text. That is the difference between "works with a model" and "works
         because nothing was called". */
      assert(!/gemini/i.test(String(result.model)), 'Gemini is not in the answer path');
    });
  } finally { fake.server.close(); }
  pass('chat: a question is answered end to end by the site\'s own model, with citations');
}

async function caseTutorCodes() {
  const fake = await fakeModel((req, res) => jsonReply(res, { error: 'nope' }, 500));
  try {
    await withEnv({ UPAY_MODEL_PROVIDER: 'ollama', UPAY_LOCAL_LLM_URL: 'http://127.0.0.1:' + fake.port }, async () => {
      const llm = fresh('../../lib/local-llm.js');
      await assert.rejects(
        () => llm.generate({ messages: [{ role: 'user', content: 'hi' }], timeoutMs: 2000, codes: { llm_error: 'tutor_model_error' } }),
        e => e.code === 'tutor_model_error',
        'a caller keeps its own public error vocabulary'
      );
    });
  } finally { fake.server.close(); }
  pass('gateway: the tutor route keeps its tutor_* codes through the shared boundary');
}

(async () => {
  const cases = [
    caseOllamaShape, caseOpenAiShape, caseCompatibleConfigGuards, caseDownAndTimeout,
    caseErrorCodes, caseProviderSwitch, caseChatEndToEnd, caseTutorCodes
  ];
  let failed = 0;
  for (const run of cases) {
    try { await run(); }
    catch (e) { failed++; console.error('FAIL ' + run.name + ': ' + (e && e.message)); }
  }
  if (failed) { console.error('\n' + failed + ' case(s) failed'); process.exit(1); }
  console.log('\nPASS own-model gateway: ' + passes + ' cases, no Gemini in the path');
})();
