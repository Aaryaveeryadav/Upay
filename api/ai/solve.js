'use strict';
const squareInteger = require('../../assets/js/square-integers.js');
const languagePolicy = require('../../assets/js/language-policy.js');
const solveTiming = require('../../assets/js/solve-timing.js');
const taskRouting = require('../../assets/js/task-routing.js');
const solvePolicy = require('../../lib/solve-policy.js');
const { consumeAI } = require('../../lib/ai-usage.js');
const { aiFailure } = require('../../lib/ai-status.js');
const { callGeminiResilient, readBody, json, firstJSON } = require('../../lib/gemini.js');
const { requireStudent } = require('../../lib/supabase-auth.js');

/* In-memory LRU cache (survives for the life of the function instance). */
const CACHE = new Map();
const CACHE_MAX = 400;
function cacheGet(k) { const v = CACHE.get(k); if (v) { CACHE.delete(k); CACHE.set(k, v); } return v; }
function cacheSet(k, v) { CACHE.set(k, v); if (CACHE.size > CACHE_MAX) { const firstKey = CACHE.keys().next().value; CACHE.delete(firstKey); } }

const repairNumericDots = (s) => String(s || '').replace(/(\d)·(\d)/g, '$1.$2');
function repairStructure(s) {
  s = String(s || '');
  // try closing unclosed braces/brackets at the end
  let ob = 0, ar = 0, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') inStr = !inStr;
    if (inStr) continue;
    if (c === '{') ob++; else if (c === '}') ob--;
    if (c === '[') ar++; else if (c === ']') ar--;
  }
  while (ar-- > 0) s += ']';
  while (ob-- > 0) s += '}';
  return s;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'authorization,content-type');
    res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    return res.status(204).send('');
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const solveStarted = Date.now();
  // Provider-backed calls spend the owner's quota. Require a verified Supabase
  // session; this is not a substitute for production abuse/rate controls.
  const user = await requireStudent(req, res);
  if (!user) return;

  let b;
  try { b = await readBody(req); }
  catch (e) { return json(res, 400, { error: 'bad json' }); }

  const question = String(b.question || '').trim();
  if (question.length < 3) return json(res, 400, { error: 'Type a question first.' });

  const subjectRouting = taskRouting.resolve(question, String(b.selectedSubject || b.subject || 'maths'));
      const subject = subjectRouting.subject;
      const chapterTitle=subjectRouting.changed?'':String(b.chapterTitle||'').slice(0,200);
      const contextRequest=languagePolicy.contextRequest(question,subject,chapterTitle);
      if(contextRequest)return json(res,422,contextRequest);
      if (subjectRouting.language) b.lang = subjectRouting.language;
      if (subjectRouting.changed) b.chapter = 0;
  const timing = solveTiming.forQuestion(question,subject);
  const solveDeadline = solveStarted + timing.serverMs;
  const clarification = squareInteger.clarification(question);
  if (clarification) return json(res, 422, clarification);
  const cls = Number(b.cls) || 10;
  const exact = ['maths','applied-maths'].includes(subject) && squareInteger.solve(question, b.lang);
  if (exact) return json(res, 200, Object.assign({subjectRouting},exact));
  const isAccountancy = subject === 'accountancy' || subject === 'computerized-accounting';
  const isEconomics = subject === 'economics';
  const isEnglish12 = subject === 'english' && cls === 12;
  const noOfficialKey = isAccountancy || isEconomics || isEnglish12 || subjectRouting.task === 'writing' || ['social','hindi','english','sanskrit'].includes(subject);
  // Never reuse one student's potentially private prompt/answer for another.
  const cacheKey = JSON.stringify([solvePolicy.VERSION, user.id, subject, cls, String(b.lang || 'en').slice(0, 2).toLowerCase(), question.toLowerCase()]);
  const cached = noOfficialKey ? null : cacheGet(cacheKey);
  if (cached && !b.refresh) return json(res, 200, Object.assign({ cached: true }, cached));

  if (!await consumeAI(user, res)) return;

  const isSci = ['science', 'physics', 'chemistry', 'biology'].includes(subject);
  const isMaths = ['maths', 'applied-maths'].includes(subject);
  const isLang = subject === 'hindi' || subject === 'english' || subject === 'sanskrit';
  const isSocial = subject === 'social';

  const mathsPrompt = [
    'You are an experienced CBSE Class ' + cls + ' Mathematics teacher. A student has typed the question below.',
    'Solve THAT question — the one actually asked. Never substitute a similar question you have seen before.',
    'Reply with ONLY this JSON shape:',
    '{"question_understood":"<restate the question in one line>",',
    ' "answer":"<final answer, short, with units>",',
    ' "summary":"<2 sentences: what the problem is about, and the idea that unlocks it>",',
    ' "approaches":[{"name":"<method>","tag":"<when to use it>",',
    '   "steps":[{"t":"<what to do>","m":"<the actual working, one maths line>","note":"<why / common slip, optional>"}],',
    '   "why":"<why it works>","watch":"<common mistake>"}],',
    ' "check":"<how to verify the answer>",',
    ' "diagram":{"type":"plane|triangle|circle|bars|solid","points":[...],"circles":[...],"segments":[...],"bars":[...],"parts":[...],"labels":[...],"caption":"..."}}',
    'Rules:',
    '- Give at least four genuinely useful complete approaches. Same working under two labels is forbidden.',
    '- Every step shows real working with the question\'s own numbers.',
    '- Verify arithmetic before writing. No unique answer? Say so in "answer".',
    '- Use · for decimals, √ π θ ° ∠ △ ⇒ as needed.',
    '- Include an honest diagram when it helps explain the question.',
    '- diagram.type="solid" ONLY for mensuration questions that actually mention a solid (cylinder/cone/hemisphere/sphere/frustum/cuboid) AND give r/h/side.',
    '  When the solid isn\'t named or numbers aren\'t given, DO NOT invent a cylinder — return diagram:null instead.',
    '- Plane geometry: use "points" + "segments" with real coordinates.',
    '- Circles/tangents/chords: use "circles" with real radius + "segments".',
    '- Trig/heights: put the right-triangle vertices in "points" and label the angle.',
    '- Statistics: use "bars" with the real frequencies.'
  ];
  const sciencePrompt = [
    'You are an experienced CBSE Class ' + cls + ' Science teacher (Physics / Chemistry / Biology). Answer the question the student asked.',
    'Reply with ONLY this JSON shape:',
    '{"question_understood":"<restate in one line>",',
    ' "answer":"<short final answer with units where needed>",',
    ' "summary":"<2 sentences on what this is testing and the key idea>",',
    ' "approaches":[{"name":"<method>","tag":"<when to use it>",',
    '   "steps":[{"t":"<what to do/explain>","m":"<any formula/equation/chemical-equation","note":"<common slip, optional>"}],',
    '   "why":"<why this reasoning is valid>","watch":"<typical student mistake>"}],',
    ' "check":"<how to verify>",',
    ' "diagram":<either null (no figure needed) OR a figure object below>}',
    'Rules:',
    '- Give at least four genuinely useful complete approaches.',
    '- Numericals: show every substitution with units. Balance every equation atom-by-atom.',
    '- Hindi NOT needed — English only.',
    '- Return a "diagram" ONLY when the question is about something that has a diagram:',
    '  • Ray optics: {"type":"lens","lens":"convex|concave",...} or {"type":"mirror",...}.',
    '  • Circuits: {"type":"circuit","caption":"..."}.',
    '  • Mechanics: {"type":"pulley","mechanism":"incline|pendulum|pulley",...}.',
    '  • Chemistry apparatus: {"type":"apparatus","parts":[...],...}.',
    '  • Biology: {"type":"bio","kind":"leaf|cell|flower|organ",...}.',
    '- For theory without apparatus, use a conceptual flow diagram when helpful.',
    '- NEVER set diagram.type to "solid", "composite", "plane", "triangle", "circle", or "bars" for Chemistry or Biology.',
    '- NEVER set diagram.type to "solid" or "composite" for science — cylinders/cones are Maths mensuration shapes.'
  ];
  const socialPrompt = [
    'You are an experienced CBSE Class ' + cls + ' Social Science teacher. Answer the question asked.',
    'Reply with ONLY JSON: {"question_understood":"...","answer":"...","summary":"...","approaches":[{"name":"...","tag":"...","steps":[{"t":"..."}],"why":"...","watch":"..."}],"check":"...","diagram":null}',
    'Use dates and article numbers accurately.'
  ];
  const langPrompt = [
    'You are an experienced CBSE Class ' + cls + ' ' + subject + ' teacher. Answer the literature/grammar question.',
    'Reply with ONLY JSON: {"question_understood":"...","answer":"...","summary":"...","approaches":[{"name":"...","tag":"...","steps":[{"t":"..."}],"why":"...","watch":"..."}],"check":"...","diagram":null}',
    'Use the language the student used.'
  ];
  const accountancyPrompt = [
    'You are a CBSE Class ' + cls + ' ' + (subject === 'computerized-accounting' ? 'Computerised Accounting' : 'Accountancy') + ' teacher.',
    'Answer only the question as printed; do not assume missing values, fabricate an official key, or silently change a date or amount.',
    'If an OR is present, handle each alternative separately and label it. If the text is incomplete, state what is missing.',
    'Show relevant accounting calculations and journal entries with clear debit and credit amounts; for spreadsheet/computer questions use the given syntax precisely.',
    'Do not invent facts or numerical data. State assumptions and uncertainty explicitly.',
    'Reply with ONLY JSON: {"question_understood":"...","answer":"...","summary":"...","approaches":[{"name":"...","tag":"...","steps":[{"t":"...","m":"..."}],"why":"...","watch":"..."}],"check":"...","diagram":null}'
  ];
  const economicsPrompt = [
    'You are an Economics teacher answering a Class ' + cls + ' question.',
    'Answer only what is asked, in the language the student used. State assumptions, units, definitions and limitations where relevant; do not invent figures or an official marking scheme.',
    'Do not claim to have read or quoted a textbook unless its text is supplied in the question. Do not invent facts or numerical data.',
    'Reply with ONLY JSON: {"question_understood":"...","answer":"...","summary":"...","approaches":[{"name":"...","tag":"...","steps":[{"t":"...","m":"..."}],"why":"...","watch":"..."}],"check":"...","diagram":null}'
  ];
  const english12Prompt = [
    'You are an English literature and language teacher answering a Class 12 question.',
    'Answer the question asked in the language the student used. Support interpretations with the supplied text where possible; acknowledge ambiguity.',
    'The textbook PDFs are not automatically supplied to you. Do not claim to have read, quoted or checked them unless the passage is actually in the question. If a precise extract is needed, ask the student to provide it.',
    'Do not invent quotations, missing details, official marking schemes or numerical data. State uncertainty where needed.',
    'Reply with ONLY JSON: {"question_understood":"...","answer":"...","summary":"...","approaches":[{"name":"...","tag":"...","steps":[{"t":"..."}],"why":"...","watch":"..."}],"check":"...","diagram":null}'
  ];
  let topicPrompt;
  if (isAccountancy) topicPrompt = accountancyPrompt;
  else if (isEconomics) topicPrompt = economicsPrompt;
  else if (isEnglish12) topicPrompt = english12Prompt;
  else if (isMaths) topicPrompt = mathsPrompt;
  else if (isSci) topicPrompt = sciencePrompt;
  else if (isSocial) topicPrompt = socialPrompt;
  else if (isLang) topicPrompt = langPrompt;
  else topicPrompt = ['Answer the supplied Class ' + cls + ' ' + subject + ' question without inventing missing information.',
    'Reply with JSON: {"question_understood":"...","answer":"...","summary":"...","approaches":[{"name":"...","steps":[{"t":"..."}]}],"check":"...","diagram":null}'];

  const prompt = topicPrompt.concat([solvePolicy.instructions,languagePolicy.instructions,chapterTitle?'Provided chapter context (not a supplied source passage): '+chapterTitle:'', '', 'QUESTION: ' + question]).join('\n');

  // Shared adaptive budget leaves headroom under the solve function duration.
  const providerController = new AbortController();
  const callOptions = {deadline:solveDeadline, signal:providerController.signal, attemptMs:timing.attemptMs, maxOutputTokens:timing.maxOutputTokens};
  let timeoutId;
  const timeoutPromise = new Promise((_, rej) => { timeoutId = setTimeout(() => {
    providerController.abort();
    const err = new Error('AI request deadline exceeded');
    err.status = 504; err.raw = 'deadline';
    rej(err);
  }, Math.max(1, solveDeadline - Date.now())); });

  let out, model;
  try {
    // Prefer fast models for the first hit; chain falls back to larger ones if needed
    out = await Promise.race([
      callGeminiResilient(prompt, null, 'gemini-3.5-flash-lite', null, callOptions),
      timeoutPromise
    ]);
    // One bounded repair call, sharing the original adaptive deadline.
    let draft;
    try { draft = firstJSON(out.text); } catch (_) { draft = null; }
    if (draft && solvePolicy.completeApproaches(draft, question, subject).length < 4) {
      out = await Promise.race([
        callGeminiResilient(solvePolicy.repairPrompt(prompt, draft), null, out.model, null, callOptions),
        timeoutPromise
      ]);
    }
    model = out.model;
  } catch (e) {
    const failure = aiFailure(e);
    if (failure.body.retryAfter) res.setHeader('retry-after', String(failure.body.retryAfter));
    return json(res, failure.http, failure.body);
  } finally {
    clearTimeout(timeoutId);
    providerController.abort();
  }

  let parsed;
  try {
    try { parsed = firstJSON(out.text); }
    catch (_) { try { parsed = firstJSON(repairNumericDots(out.text)); } catch (_) { parsed = firstJSON(repairStructure(repairNumericDots(out.text))); } }
  } catch (_) {
    return json(res, 502, { error: 'The AI returned an unusable response. Please try again.', fallback: true });
  }
  if (!parsed || !parsed.approaches) {
    return json(res, 502, { error: 'The AI returned an unexpected shape. Please try again.', fallback: true });
  }
  // Match the local server's response contract; the UI reads result,
  // questionUnderstood and verify rather than the model's snake_case keys.
  const steps = arr => (Array.isArray(arr) ? arr : []).map(st => ({
    t: String((st && st.t) || ''), m: String((st && st.m) || ''),
    note: String((st && st.note) || '')
  })).filter(st => st.t);
  const answer = {
    source: 'ai', subjectRouting, policyVersion: solvePolicy.VERSION, model: model,
    questionUnderstood: String(parsed.question_understood || ''),
    result: String(parsed.answer || ''), summary: String(parsed.summary || ''),
    verify: typeof parsed.check === 'string' ? parsed.check : '',
    approaches: solvePolicy.completeApproaches(parsed, question, subject).map(a => ({
      format: solvePolicy.proseTask(question) ? 'prose' : '', name: String((a && a.name) || 'Method'), tag: String((a && a.tag) || ''),
      steps: steps(a && a.steps), why: String((a && a.why) || ''), watch: String((a && a.watch) || '')
    })).filter(a => a.steps.length),
    diagram: solvePolicy.diagramForSubject(parsed.diagram, subject),
    conceptDiagram: solvePolicy.conceptDiagram(parsed.conceptDiagram),
    check: { state: 'unchecked', note: noOfficialKey
      ? 'AI-generated; not checked against an official answer key.'
      : 'AI-generated; not independently checked.' },
    generatedAt: new Date().toISOString()
  };
  if (answer.approaches.length < 4 || !answer.result) {
    return json(res, 502, { error: 'The AI could not provide four distinct complete approaches. Please try again.', fallback: true });
  }
  if (!noOfficialKey) cacheSet(cacheKey, answer);
  return json(res, 200, answer);
};
