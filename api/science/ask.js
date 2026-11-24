/* Class 10 Science tutor — cited answers from the local science index + Ollama.

   Honest deployment note: the model is a LOCAL Ollama instance
   (UPAY_OLLAMA_URL, default http://127.0.0.1:11434), so this route can only
   answer where the server can actually reach that model. On a hosted
   serverless deployment with no reachable model it answers 503 with
   code 'tutor_unavailable' and still returns the retrieved sources, so the
   student can read the cited pages instead of a guessed answer.

   Configuration is server-side only (see docs/science-tutor.md):
     UPAY_OLLAMA_URL, UPAY_OLLAMA_MODEL, UPAY_SCIENCE_TUTOR=off,
     UPAY_SCIENCE_INDEX (path override, tests only).
*/
'use strict';
const { readBody, json } = require('../../lib/gemini.js');
const { aiRateFloor } = require('../../lib/rate-limit.js');
const rag = require('../../lib/science-rag.js');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'content-type');
    res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    return res.status(204).send('');
  }
  if (req.method === 'GET') {
    // Capability probe for the UI: never reveals the model host or credentials.
    const s = rag.status();
    return json(res, 200, {
      ok: true,
      enabled: s.enabled,
      ready: s.ready,
      model: s.model,
      index: s.index,
      note: s.index.available
        ? 'Answers are drafted by a local model from the indexed NCERT and CBSE material.'
        : 'No science index is installed on this server, so the tutor cannot cite sources.'
    });
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST only' });

  // No account is needed to study, but the route is a provider-spending path;
  // the shared floor keeps one client from hammering a school server.
  if (!aiRateFloor(req, res, null)) return;

  let body;
  try { body = await readBody(req, 16 * 1024); }
  catch (e) { return json(res, 400, { error: 'Send a JSON body with a question.' }); }

  try {
    const chat = require('../../lib/chat.js');
    const result = await chat.answer({
      question: body.question,
      chapter: body.chapter,
      limit: body.limit,
      language: body.lang,
      history: Array.isArray(body.history) ? body.history : []
    });
    return json(res, 200, result);
  } catch (e) {
    const status = Number(e && e.status) || 500;
    const payload = {
      error: status >= 500 ? String((e && e.message) || 'The Science tutor is unavailable.') : String(e.message),
      code: (e && e.code) || 'tutor_error'
    };
    // Keep the retrieved evidence in the failure: it is still true and useful.
    if (e && e.citations) {
      payload.citations = e.citations;
      payload.retrieved = e.retrieved;
      payload.grounded = false;
      payload.question = e.question;
      payload.model = e.model;
      payload.notice = 'The sources below were retrieved from the index; the model could not draft an answer.';
    }
    if (e && e.status === 429 && e.retryAfter) res.setHeader('retry-after', String(e.retryAfter));
    return json(res, status, payload);
  }
};
