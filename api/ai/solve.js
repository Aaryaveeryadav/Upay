'use strict';
const squareInteger = require('../../assets/js/square-integers.js');
const languagePolicy = require('../../assets/js/language-policy.js');
const solveTiming = require('../../assets/js/solve-timing.js');
const taskRouting = require('../../assets/js/task-routing.js');
const solvePolicy = require('../../lib/solve-policy.js');
const integrity = require('../../lib/solve-integrity.js');
const { consumeAI } = require('../../lib/ai-usage.js');
const { aiRateFloor } = require('../../lib/rate-limit.js');
const { aiFailure } = require('../../lib/ai-status.js');
const { readBody, json, firstJSON } = require('../../lib/gemini.js');
const { generateSolve } = require('../../lib/ai-provider.js');
const { requireStudent } = require('../../lib/supabase-auth.js');
const syllabusGuard = require('../../lib/syllabus-guard.js');

function repairNumericDots(text) {
  const s = String(text || '');
  let out = '', inString = false, escaped = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; out += c; continue; }
    if (c === '·' && /\d/.test(s[i - 1] || '') && /\d/.test(s[i + 1] || '')) out += '.';
    else out += c;
  }
  return out;
}

function repairStructure(text) {
  const s = String(text || '');
  const closers = [];
  let inString = false, escaped = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{') closers.push('}');
    else if (c === '[') closers.push(']');
    else if (c === '}' || c === ']') {
      if (closers.pop() !== c) return s; // mismatched, not a safe truncation repair
    }
  }
  if (escaped) return s; // do not guess the rest of a truncated escape sequence
  let repaired = s + (inString ? '"' : '');
  while (closers.length) repaired += closers.pop();
  return repaired;
}

/* firstJSON deliberately returns null for malformed JSON rather than throwing.
   Try the safe text repairs explicitly, and only return a parsed object; callers
   can then distinguish a parse failure from a valid but incomplete answer. */
function parseSolveJSON(text) {
  const original = String(text || '');
  const numeric = repairNumericDots(original);
  const candidates = [original, numeric, repairStructure(numeric), repairStructure(original)];
  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    const parsed = firstJSON(candidate);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  }
  return null;
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
      if (['hindi-core','hindi-elective'].includes(subject) && (+b.cls !== 12 || b.board !== 'cbse'))
        return json(res,422,{error:'This Hindi course requires CBSE Class 12.'});
      const chapterTitle=subjectRouting.changed?'':String(b.chapterTitle||'').slice(0,200);
      const contextRequest=languagePolicy.contextRequest(question,subject,chapterTitle);
      if(contextRequest)return json(res,422,contextRequest);
      if (subjectRouting.language) b.lang = subjectRouting.language;
      if (subjectRouting.changed) b.chapter = 0;

  /* THE SYLLABUS GATE.
     This is the route that actually answers students in production: assets/js/app.js
     posts every question from the Ask box here, and nothing else. Until now this
     handler imported no gate at all, so the promise on the site - "off-syllabus
     questions are refused before the model runs" - was not true on the hosted
     deployment. The gate lived only in server.js, which .vercelignore excludes.

     It runs before the cache, the quota and any prompt: a refused question costs
     nothing and is never sent to Gemini. A normal 200 with an explanation, not an
     error, because being told why is more useful than being told nothing.
     tools/check/solve_gate.js holds this wiring in place. */
  const gate = syllabusGuard.check(question, { class: Number(b.cls) || 10, subject });
  if (!gate.ok) {
    return json(res, 200, {
      ok: false, refused: gate.code, severity: gate.severity || 'none',
      answer: gate.message, summary: '', approaches: [],
      notice: gate.severity === 'notice'
        ? 'This question is outside the syllabus, so it was not sent to the model.'
        : 'This question was stopped before the model ran.',
      check: '', diagram: null, conceptDiagram: null
    });
  }
  /* A long question can exhaust one call's budget. The client then asks for it
     in parts: 'core' is the answer plus the first method, 'approach' is one
     more method at a time. Each part has its own small budget, so a single
     unfinished method can no longer lose the whole answer. */
  const part = ['core', 'approach'].includes(String(b.part || '').toLowerCase())
    ? String(b.part).toLowerCase() : '';
  const partIndex = Math.max(2, Math.min(6, Number(b.index) || 2));
  const takenNames = Array.isArray(b.taken)
    ? b.taken.filter((x) => typeof x === 'string').slice(0, 6).map((x) => x.slice(0, 80))
    : [];
  const settled = b.core && typeof b.core === 'object' ? b.core : null;
  const timing = part ? solveTiming.forPart(part) : solveTiming.forQuestion(question,subject);
  const solveDeadline = solveStarted + timing.serverMs;
  const clarification = squareInteger.clarification(question);
  if (clarification) return json(res, 422, clarification);
  const cls = Number(b.cls) || 10;
  const isAccountancy = subject === 'accountancy' || subject === 'computerized-accounting';
  const isEconomics = subject === 'economics';
  const isEnglish12 = subject === 'english' && cls === 12;
  const noOfficialKey = isAccountancy || isEconomics || isEnglish12 || subjectRouting.task === 'writing' || ['social','hindi','hindi-core','hindi-elective','english','sanskrit'].includes(subject);
  if (!aiRateFloor(req, res, user)) return;
  if (!await consumeAI(user, res)) return;

  const isSci = ['science', 'physics', 'chemistry', 'biology'].includes(subject);
  const isMaths = ['maths', 'applied-maths'].includes(subject);
  const isLang = ['hindi','hindi-core','hindi-elective'].includes(subject) || subject === 'english' || subject === 'sanskrit';
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
    '- Trig/heights: put the right-triangle vertices in "points", label the angle, and label the height or distance you computed.',
    '- In any diagram, label the answer values you calculated so the picture explains the result; never label a figure you did not compute.',
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
    '  • Circuits: {"type":"circuit","caption":"..."}. For a mixed series–parallel resistor network of two or three resistors the app draws its own verified figure from the given values, so diagram:null is correct there.',
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
  else if (['hindi-core','hindi-elective'].includes(subject)) topicPrompt = langPrompt.concat([
    'This is CBSE Class 12 Hindi '+(subject==='hindi-core'?'Core (Aaroh and Vitan).':'Elective (Antara and Antaral).'),
    'Write in Hindi. The textbook pages are not supplied to you. Request the passage if needed. Do not invent quotations, marks or an official answer key.'
  ]);
  else if (isEnglish12) topicPrompt = english12Prompt;
  else if (isMaths) topicPrompt = mathsPrompt;
  else if (isSci) topicPrompt = sciencePrompt;
  else if (isSocial) topicPrompt = socialPrompt;
  else if (isLang) topicPrompt = langPrompt;
  else topicPrompt = ['Answer the supplied Class ' + cls + ' ' + subject + ' question without inventing missing information.',
    'Reply with JSON: {"question_understood":"...","answer":"...","summary":"...","approaches":[{"name":"...","steps":[{"t":"..."}]}],"check":"...","diagram":null}'];

  const qualityRules = [
    'EXPLAIN THE WHY: for every sub-part, state not only what happens but WHY it happens (the law/principle and the causal chain). A bare table of same/different answers without the reason is incomplete.',
    'MULTI-PART FIGURES: if different parts of the question involve different setups or figures (e.g. series AND parallel circuits, two cases, two diagrams in the book), return a "diagrams" array with ONE honest figure per part, each with its own caption naming the part it belongs to. Never force several setups into one figure, and never invent a figure for a part that has none.'
  ];
  const partRules = part === 'core'
    ? ['THIS IS PART 1 OF 4 of a deliberately split answer, because the question is long.',
      'Return JSON with question_understood, answer, summary, check, diagram and exactly ONE approach — the clearest complete method, finished to the final answer.',
      'Do not write the other methods here and do not promise them; they are requested separately. Keep the whole reply under 450 words.']
    : part === 'approach'
      ? ['THIS IS PART ' + partIndex + ' OF 4 of a deliberately split answer, because the question is long.',
        'The answer has already been settled on an earlier pass' + (settled && settled.answer ? ': ' + String(settled.answer).slice(0, 400) : '') + '.',
        'Methods already shown: ' + (takenNames.length ? takenNames.join('; ') : '(the first method)') + '.',
        'Return JSON {"approaches":[ exactly ONE ]} with one MORE genuinely different, complete method that reaches the SAME answer.',
        'Do not repeat or rename those methods, do not change the answer, and do not restate the question. Keep the whole reply under 350 words.']
      : [];
  const checkedEvidence = integrity.evidence(question);
  const prompt = topicPrompt.concat(qualityRules,[solvePolicy.instructions,languagePolicy.instructions,checkedEvidence ? checkedEvidence.text : '',chapterTitle?'Provided chapter context (not a supplied source passage): '+chapterTitle:''].concat(partRules,['', 'QUESTION: ' + question])).join('\n');

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
      generateSolve(prompt, null, 'gemini-3.5-flash-lite', callOptions),
      timeoutPromise
    ]);
    // One bounded repair call, sharing the original adaptive deadline.
    const draft = parseSolveJSON(out.text);
    const wantFour = !part;
    if (wantFour && (!draft || solvePolicy.completeApproaches(draft, question, subject).length < solvePolicy.minimumApproaches(question) || integrity.conflict(question, draft))) {
      // A malformed response is a null result from firstJSON, not an exception.
      // Give the provider one bounded chance to return a valid replacement.
      out = await Promise.race([
        generateSolve(solvePolicy.repairPrompt(prompt, draft), null, out.model, callOptions),
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

  const parsed = parseSolveJSON(out.text);
  if (!parsed) {
    return json(res, 502, { error: 'The AI returned an unusable response. Please try again.', fallback: true });
  }
  if (integrity.conflict(question, parsed)) return json(res, 502, {error:'The AI answer conflicts with an independent calculation. Please try again.', fallback:true});
  if (!parsed.approaches) {
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
      format: solvePolicy.proseTask(question, subject) ? 'prose' : '', name: String((a && a.name) || 'Method'), tag: String((a && a.tag) || ''),
      steps: steps(a && a.steps), why: String((a && a.why) || ''), watch: String((a && a.watch) || '')
    })).filter(a => a.steps.length),
    diagram: solvePolicy.diagramForSubject(parsed.diagram, subject),
    diagrams: solvePolicy.diagramsForSubject(parsed, subject),
    conceptDiagram: solvePolicy.conceptDiagram(parsed.conceptDiagram),
    check: { state: 'unchecked', note: noOfficialKey
      ? 'AI-generated; not checked against an official answer key.'
      : 'AI-generated; not independently checked.' },
    generatedAt: new Date().toISOString()
  };
  if (part) {
    /* A part is small on purpose: one method, and for 'core' the answer too. */
    if (!answer.approaches.length) {
      return json(res, 502, { error: 'That part of the answer did not come back. Please try again.', fallback: true });
    }
    if (part === 'core' && !answer.result) {
      return json(res, 502, { error: 'The answer did not come back. Please try again.', fallback: true });
    }
    answer.part = part;
    if (part === 'approach') answer.index = partIndex;
    answer.complete = false;
    return json(res, 200, answer);
  }
  if (answer.approaches.length < solvePolicy.minimumApproaches(question) || !answer.result) {
    return json(res, 502, { error: 'The AI could not provide four distinct complete approaches. Please try again.', fallback: true });
  }
  return json(res, 200, answer);
};
