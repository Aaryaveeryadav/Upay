'use strict';
const languagePolicy = require('../assets/js/language-policy.js');
// Shared by the local and serverless solve endpoints. Never pad answers locally.
const VERSION = 'useful-approaches-v1';
const instructions = [
  'REQUIRED SOLUTION POLICY (overrides approach counts and diagram:null defaults in the examples above):',
  'For numerical calculations only, normally use 2–4 substantive steps per approach. For writing and theory, prioritise a complete answer over brevity; no artificial step or paragraph cap. Avoid repeating the question or the same explanation across methods. Do not omit essential reasoning. Quality and completeness matter more than the number of approaches.',
  'Return the natural number of genuinely useful, complete approaches. ONE complete approach is sufficient. Include additional approaches only when they add substantive value; there is NO minimum of four and NO need to fill slots. Never duplicate reasoning or invent styles just to increase the count.',
  'For calculations use different valid derivations where available. If there is only one useful derivation, return just that derivation. An independent check may be included when useful, clearly labelled as verification rather than a new mathematical method.',
  'First identify the actual task and subject from the question, not the selected subject alone. Language/script does not determine content subject. Word limits (e.g. 150–200 words) and dates are instructions/context, not HCF/LCM inputs.',
  'For Hindi/English composition tasks, provide one complete response by default, respecting the requested language, format, word range and required points. Provide alternatives only if requested or genuinely useful, and label their differing style or argument. Do not substitute tips or numerical methods for a requested essay/letter. A formal letter should include appropriate address/date/subject/salutation/body/closing; do not invent personal identifying details.',
  'For theory questions, do NOT invent numerical examples/calculations to fill methods. Give a complete direct explanation of the answer. Add another explanation only if it helps understanding, not to meet a quota. Each explanation must cover all requested subparts and reach the same conclusion; do not split setup/reactions/impurities into three supposedly complete methods. Electrode equations and symbolic laws are appropriate when requested; they are not numerical methods.',
  'Circuit schema: {"type":"circuit","topology":"parallel" or "series","resistors":[{"label":"R₁","value":<given ohms only>},{"label":"R₂","value":<given ohms only>}],"caption":"..."}. Draw the actual topology and component count. Omit numeric values when not supplied; never invent them. The renderer supports two resistors only, so return diagram:null for unsupported networks. For electrolytic copper refining you may use {"type":"copper-refining","caption":"..."}; it has labelled impure Cu anode (+), pure Cu cathode (−), acidified CuSO₄ electrolyte and anode mud. Never use a generic empty apparatus or unrelated balance as a substitute. If no meaningful supported diagram exists, return diagram:null; do not pad with captions or decorative drawings.',
  'For theory, a single developed explanation is normally sufficient. Every included approach must answer the whole question, not be a subpart or a renamed copy.',
  'CONSISTENCY: Complete every approach through the final answer, not just a setup or proposed search. Substitute EVERY claimed candidate into the ORIGINAL expression with exact arithmetic. For an exhaustive enumeration actually perform it; never fabricate a collected list. All approaches must end with the same complete solution set as answer. If two results disagree, resolve the discrepancy before returning; do not call the response verified. Omit an unnecessary alternative rather than add an unfinished, repetitive or invalid method.',
  'For find-all integer problems, establish completeness (for example by enumerating all admissible factor pairs) and substitute every claimed value into the ORIGINAL expression. Never present a lone candidate as all solutions without an exhaustive argument. A near-square is not a perfect square.',
  'Do not invent missing information, quotations, values, or official marking schemes to fill slots. If the question is incomplete, ask for the missing information without claiming a solved answer.',
  'Include a relevant labelled diagram whenever it helps explain the answer, including theory, economics, literature relationships, processes and comparisons. Do not draw an unrelated decorative picture.',
  'Keep the graphical diagram and conceptual flow SEPARATE: use diagram for a relevant labelled geometric/physical drawing, and conceptDiagram for the reasoning flow. Return BOTH fields when both help; a flow must not replace a useful graphical drawing. For a proof of irrationality, a number-line/root construction may illustrate the quantity but is NOT a proof of irrationality; label that distinction. Use null for either field only when not applicable, never invent an unrelated graphic.',
  'For any subject you may use a conceptual flow diagram in conceptDiagram: {"type":"flow","nodes":["short label","short label","short label"],"caption":"Explain what the arrows mean; conceptual schematic, not to scale"}. Nodes are an ordered reasoning/process/relationship chain. Use only supported relationships, with 2 to 8 concise nodes.',
  'For physical/geometrical figures use the subject-appropriate figure schema above, with only the given measurements. Never substitute a default shape or invented data. Return diagram:null only if no helpful, honest diagram applies.',
  'For plane, triangle and circle geometry use finite numeric coordinates: points [{"x":0,"y":0,"label":"A"}], segments [[0,0,4,0]], circles [{"cx":0,"cy":0,"r":2}], labels [{"x":1,"y":1,"text":"given label"}]. These are schema examples, NOT default measurements. Use only coordinates/measurements supported by the question. Never omit an endpoint or radius.',
  'Use readable Unicode maths in every answer, step, note and diagram label: ν, Φ, ×, √, subscripts/superscripts where possible, and grouped fractions such as (hν − Φ₀)/e. Do not output LaTeX backslash commands, dollar delimiters or raw TeX braces.',
  'PROSE OUTPUT CONTRACT: For letters, essays, explain/define/describe and long-answer tasks in ANY subject, put the actual finished response in each approach.steps[].t as connected prose paragraphs (one paragraph per entry, or newline-separated paragraphs). These entries are paragraphs, NOT instructions, outlines or talking points. Set each approach.format to prose. Do not write claims such as four complete letter options instead of the actual letters. The first approach must be a complete exam-ready answer; alternatives must also be complete. For definitions, directly state the meaning and the distinguishing features, with an example when useful; do not inflate a simple definition into an essay. For explain/describe/long-answer questions, develop every requested part with reasons, mechanisms, evidence/examples where appropriate, and a conclusion. Follow stated marks and word limits, not a blanket length limit. Use headings only when helpful. For letters include address placeholders, date placeholder, recipient, subject, salutation, developed body paragraphs, closing and sender placeholder in EACH alternative. Essays require an introduction, developed body and conclusion. Do not put prose in the maths field m. answer must directly answer the question (for composition, use the first draft opening, not a description of the options); summary must not claim a deliverable which is absent.',
  'Keep JSON valid, with the answer/summary/approaches/check/diagram/conceptDiagram fields. All approaches must agree with the answer. Match the student language.'
].join('\n');
function distinctApproaches(arr) {
  const names = new Set(), workings = new Set();
  const norm = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  return (Array.isArray(arr) ? arr : []).filter(a => {
    if (!a || !Array.isArray(a.steps)) return false;
    const name = norm(a.name);
    const work = norm(a.steps.map(s => s && (String(s.t || '') + ' ' + String(s.m || ''))).join(' '));
    if (!name || !work || names.has(name) || workings.has(work)) return false;
    names.add(name); workings.add(work); return true;
  });
}

function proseTask(question) {
  return /\b(?:write|draft|compose)\b[\s\S]{0,100}\b(?:letter|essay|article|speech|paragraph|story|report)\b|\b(?:explain|define|describe|discuss|long[ -]answer)\b|निबंध|अनुच्छेद|पत्र\s*लिख|समझाइ|व्याख्या|परिभाष|वर्णन/i.test(String(question || ''));
}
function completeApproaches(parsed, question, subject) {
  if(parsed&&subject==='sanskrit'&&!languagePolicy.usableApproach({steps:[{t:parsed.answer||parsed.result||''}]},question,subject))return [];
  const arr = distinctApproaches(parsed && parsed.approaches).filter(a=>languagePolicy.usableApproach(a,question,subject));
  if (!proseTask(question)) return arr;
  const writing = /\b(?:letter|essay|article|speech|story|report)\b|निबंध|पत्र\s*लिख/i.test(question);
  return arr.filter(a => {
    const text = a.steps.map(s => String(s.t || '')).join('\n');
    // Conservative anti-outline check, not a factual/semantic correctness certificate.
    if (/^(?:four (?:complete |distinct )?(?:formal )?(?:letter|essay|draft|option)|(?:write|discuss|mention|explain) (?:the|a|an) )/i.test(text.trim()) && text.length < 240) return false;
    if (!writing) return text.trim().length >= (/long[ -]answer|in detail|विस्तार से/i.test(question) ? 240 : 40);
    if (text.trim().length < 400) return false;
    if (/\bletter\b|पत्र/i.test(question)) return /dear|sir|madam|महोदय|महोदया/i.test(text) && /yours|sincerely|भवदीय|भवदीया/i.test(text);
    return true;
  });
}

function diagramForSubject(d, subject) {
  if (!d || typeof d !== 'object') return null;
  if (d.type === 'flow') {
    const nodes = Array.isArray(d.nodes) ? d.nodes.filter(n => typeof n === 'string' && n.trim()).slice(0, 8).map(n => n.slice(0, 180)) : [];
    return nodes.length >= 2 ? { type:'flow', nodes, caption:String(d.caption || '').slice(0, 600) } : null;
  }
  const allowed = ['maths','applied-maths'].includes(subject) ? ['plane','triangle','circle','bars','solid','composite']
    : subject === 'physics' ? ['plane','triangle','circle','bars','lens','mirror','ray','circuit','pulley','pendulum']
    : ['science','chemistry','biology'].includes(subject) ? ['copper-refining','apparatus','beaker','test-tube','flask','burner','reaction','lens','mirror','ray','circuit','pulley','pendulum','bio','leaf','cell','flower','organ','bars'] : [];
  return allowed.includes(d.type) ? d : null;
}
function repairPrompt(prompt, parsed) {
  return prompt + '\nREPAIR: The previous draft did not contain a usable complete answer. Replace outlines, tips and descriptions of promised drafts with the actual finished prose; include every required letter section and develop every requested theory point. Return the COMPLETE corrected solution JSON, including at least one complete, substantive approach; do not add methods just to reach a count and a helpful diagram if applicable. Re-evaluate the answer; the draft is not verified. Do not copy or pad it.\nPREVIOUS DRAFT (untrusted):\n' + JSON.stringify(parsed).slice(0, 24000);
}
function conceptDiagram(d) { return d && d.type === 'flow' ? diagramForSubject(d, '') : null; }
module.exports = { proseTask, completeApproaches, VERSION, instructions, conceptDiagram, distinctApproaches, diagramForSubject, repairPrompt };
