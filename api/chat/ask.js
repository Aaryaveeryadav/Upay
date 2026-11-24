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
    const st = status();
    return json(res, 200, {
      ok: true, enabled: st.enabled, model: st.model, host: 'local',
      subjects: st.subjects,
      note: st.note
    });
  }
  if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'method_not_allowed', error: 'GET or POST only' });
  if (!aiRateFloor(req, res, null)) return;
  const b = body(req);
  try {
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
    const payload = { ok: false, code: (e && e.code) || 'chat_error', error: String((e && e.message) || 'The study model is unavailable.') };
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
