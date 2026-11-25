'use strict';
/* Study chat for every subject: POST /api/chat/ask
 *
 *   { question, class, subject, chapter?, lang?, history? }
 *
 * The answer comes from the site's own local model, reads only the indexed
 * textbook/PYQ material for that class and subject, cites it as [1], and
 * refuses questions outside the syllabus. No account is required for the chat
 * itself (it spends local GPU time, not provider money); the shared per-IP
 * floor and the syllabus gate bound abuse.
 */
const { answer, status } = require('../../lib/chat.js');
const rag = require('../../lib/science-rag.js');
const { aiRateFloor } = require('../../lib/rate-limit.js');
const { json } = require('../../lib/gemini.js');

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (_) { return {}; }
}

module.exports = async function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'authorization,content-type');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('cache-control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method === 'GET') {
    /* One probe for both paths. The subject chat reads model + subjects; the
       legacy tutor screen reads ready + index. Neither field set is secret, and
       the model host is never included. */
    const st = status();
    const s = rag.status();
    return json(res, 200, {
      ok: true, enabled: st.enabled, ready: s.ready, model: st.model, host: 'local',
      subjects: st.subjects, index: s.index,
      note: s.index.available
        ? 'Answers are drafted from the indexed NCERT and CBSE material, with the pages shown.'
        : 'No science index is installed on this server, so the tutor cannot cite sources.'
    });
  }
  if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'method_not_allowed', error: 'GET or POST only' });
  if (!aiRateFloor(req, res, null)) return;
  const b = body(req);
  try {
    /* A missing class/subject means Class 10 Science, which is what the legacy
       tutor path always meant; the subject chat always sends both. */
    const result = await answer({
      question: b.question,
      class: b.class,
      subject: b.subject,
      chapter: b.chapter,
      language: b.lang,
      history: b.history
    });
    return json(res, 200, result);
  } catch (e) {
    /* The model codes are the chat's own (llm_*). This route's callers switch
       on tutor_* — see docs/science-tutor.md — so translate at this boundary
       rather than change a contract real pages depend on. */
    const TUTOR_CODES = {
      llm_unavailable: 'tutor_unavailable', llm_timeout: 'tutor_timeout',
      llm_model_missing: 'tutor_model_missing', llm_configuration: 'tutor_configuration',
      llm_disabled: 'tutor_disabled', llm_error: 'tutor_model_error', llm_empty: 'tutor_error'
    };
    const code = (e && e.code) || 'chat_error';
    const payload = {
      ok: false,
      // The tutor_* vocabulary is the documented public contract
      // (docs/science-tutor.md) and the legacy screen switches on it; the
      // React chat only shows `error`, so one vocabulary serves both.
      code: TUTOR_CODES[code] || code,
      error: String((e && e.message) || 'The study model is unavailable.')
    };
    if (e && e.status === 429 && e.retryAfter) res.setHeader('retry-after', String(e.retryAfter));
    if (e && e.citations) {
      payload.citations = e.citations;
      payload.retrieved = e.retrieved;
      payload.question = e.question;
      payload.model = e.model;
      payload.grounded = false;
      payload.notice = 'The sources below came from the index; the model could not draft an answer.';
    }
    return json(res, Number(e && e.status) || 500, payload);
  }
};
