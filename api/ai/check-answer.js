'use strict';
/* AI answer checking for mock tests: judge ONE student answer against the
   question (and a reference answer when the bank supplies one). This is an
   AI opinion for practice feedback — never an official board marking. */
const { callGeminiResilient, readBody, json, firstJSON } = require('../../lib/gemini.js');
const { requireStudent } = require('../../lib/supabase-auth.js');
const { consumeAI } = require('../../lib/ai-usage.js');
const { aiFailure } = require('../../lib/ai-status.js');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'authorization,content-type');
    res.setHeader('access-control-allow-methods', 'POST,OPTIONS');
    return res.status(204).send('');
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  const user = await requireStudent(req, res);
  if (!user) return;

  let b;
  try { b = await readBody(req); } catch (e) { return json(res, 400, { error: 'bad json' }); }

  const question = String(b.question || '').trim().slice(0, 4000);
  const studentAnswer = String(b.studentAnswer || '').trim().slice(0, 4000);
  const reference = String(b.referenceAnswer || '').trim().slice(0, 2000);
  const subject = String(b.subject || 'general').slice(0, 40);
  const cls = Number(b.cls) || 10;
  const lang = String(b.lang || 'en').slice(0, 2).toLowerCase() === 'hi' ? 'hi' : 'en';
  if (question.length < 3) return json(res, 400, { error: 'Question is missing.' });
  if (!studentAnswer) return json(res, 400, { error: 'Student answer is empty.' });

  if (!await consumeAI(user, res)) return;

  const prompt = [
    'You are an experienced CBSE Class ' + cls + ' ' + subject + ' teacher checking a student\'s practice-test answer.',
    'Judge ONLY whether the student\'s answer answers the question correctly. Be strict about facts, values, units and required points; be fair about wording and language.',
    reference
      ? 'A reference answer is supplied. Treat it as the expected answer unless it is plainly wrong; if it looks wrong, say so in the verdict "cannot-tell".'
      : 'No reference answer is supplied. Work out the correct answer yourself first, then compare.',
    'Reply with ONLY this JSON (no markdown):',
    '{"verdict":"correct|partly-correct|incorrect|cannot-tell",',
    ' "correctAnswer":"<the correct answer, short>",',
    ' "feedback":"<2-3 sentences: what is right, what is wrong/missing, and exactly where the student went wrong>",',
    ' "marksHint":"<e.g. likely full marks / about half marks / no marks — an AI estimate only>"}',
    'Rules: never claim this is official board marking. If the question or answer is incomplete or ambiguous, use "cannot-tell". Answer in ' + (lang === 'hi' ? 'Hindi' : 'English') + '.',
    '',
    'QUESTION: ' + question,
    reference ? 'REFERENCE ANSWER: ' + reference : '',
    'STUDENT ANSWER: ' + studentAnswer
  ].filter(Boolean).join('\n');

  let out;
  try {
    out = await callGeminiResilient(prompt, null, 'gemini-3.5-flash-lite', null, { maxOutputTokens: 900 });
  } catch (e) {
    const failure = aiFailure(e);
    if (failure.body.retryAfter) res.setHeader('retry-after', String(failure.body.retryAfter));
    return json(res, failure.http, failure.body);
  }

  const parsed = firstJSON(String(out.text || ''));
  if (!parsed || typeof parsed !== 'object') {
    return json(res, 502, { error: 'The AI returned an unusable response. Please try again.', fallback: true });
  }
  const verdicts = ['correct', 'partly-correct', 'incorrect', 'cannot-tell'];
  const verdict = verdicts.includes(parsed.verdict) ? parsed.verdict : 'cannot-tell';
  return json(res, 200, {
    source: 'ai-check', model: out.model || null, verdict,
    correctAnswer: String(parsed.correctAnswer || '').slice(0, 1200),
    feedback: String(parsed.feedback || '').slice(0, 1500),
    marksHint: String(parsed.marksHint || '').slice(0, 200),
    disclaimer: 'AI practice feedback — not official board marking.'
  });
};
