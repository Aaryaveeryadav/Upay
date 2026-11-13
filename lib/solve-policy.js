'use strict';
// Shared by the local and serverless solve endpoints. Never pad answers locally.
const VERSION = 'four-approaches-v2';
const instructions = [
  'REQUIRED SOLUTION POLICY (overrides approach counts and diagram:null defaults in the examples above):',
  'Be concise to reduce waiting: normally use 2–4 substantive steps per approach, short summaries and short diagram labels. Avoid repeating the question or the same explanation across methods. Do not omit essential reasoning or any of the required four approaches.',
  'Return at least 4 genuinely distinct, useful approaches for EVERY subject, including theory and calculations.',
  'For calculations use different valid derivations where available. If there are not four independent derivations, explicitly label alternative explanation styles: conceptual reasoning, worked application, or an independent check. Do not pretend they are independent mathematical methods.',
  'First identify the actual task and subject from the question, not the selected subject alone. Language/script does not determine content subject. Word limits (e.g. 150–200 words) and dates are instructions/context, not HCF/LCM inputs.',
  'For Hindi/English composition tasks, provide FOUR complete alternative responses to the same prompt, each respecting the requested language, format, word range and required points. Label the differing style or argument. Do not substitute tips or numerical methods for a requested essay/letter. A formal letter should include appropriate address/date/subject/salutation/body/closing; do not invent personal identifying details.',
  'For theory questions, do NOT invent numerical examples/calculations to fill methods. Give four complete explanations of the SAME answer in different styles (e.g. direct textbook description, cause-and-effect narrative, a careful analogy with limits, and an application/comparison). Each explanation must cover all requested subparts and reach the same conclusion; do not split setup/reactions/impurities into three supposedly complete methods. Electrode equations and symbolic laws are appropriate when requested; they are not numerical methods.',
  'Circuit schema: {"type":"circuit","topology":"parallel" or "series","resistors":[{"label":"R₁","value":<given ohms only>},{"label":"R₂","value":<given ohms only>}],"caption":"..."}. Draw the actual topology and component count. Omit numeric values when not supplied; never invent them. The renderer supports two resistors only, so return diagram:null for unsupported networks. For electrolytic copper refining you may use {"type":"copper-refining","caption":"..."}; it has labelled impure Cu anode (+), pure Cu cathode (−), acidified CuSO₄ electrolyte and anode mud. Never use a generic empty apparatus or unrelated balance as a substitute. If no meaningful supported diagram exists, return diagram:null; do not pad with captions or decorative drawings.',
  'For theory use four developed explanations, e.g. first-principles reasoning, an accurate example/analogy (label its limits), a comparison, and a cause-and-effect explanation. Each must answer the actual question with substantive steps, not renamed copies.',
  'For find-all integer problems, establish completeness (for example by enumerating all admissible factor pairs) and substitute every claimed value into the ORIGINAL expression. Never present a lone candidate as all solutions without an exhaustive argument. A near-square is not a perfect square.',
  'Do not invent missing information, quotations, values, or official marking schemes to fill four slots. If the question is incomplete, explain the missing information from four useful perspectives without claiming a solved answer.',
  'Include a relevant labelled diagram whenever it helps explain the answer, including theory, economics, literature relationships, processes and comparisons. Do not draw an unrelated decorative picture.',
  'Keep the graphical diagram and conceptual flow SEPARATE: use diagram for a relevant labelled geometric/physical drawing, and conceptDiagram for the reasoning flow. Return BOTH fields when both help; a flow must not replace a useful graphical drawing. For a proof of irrationality, a number-line/root construction may illustrate the quantity but is NOT a proof of irrationality; label that distinction. Use null for either field only when not applicable, never invent an unrelated graphic.',
  'For any subject you may use a conceptual flow diagram in conceptDiagram: {"type":"flow","nodes":["short label","short label","short label"],"caption":"Explain what the arrows mean; conceptual schematic, not to scale"}. Nodes are an ordered reasoning/process/relationship chain. Use only supported relationships, with 2 to 8 concise nodes.',
  'For physical/geometrical figures use the subject-appropriate figure schema above, with only the given measurements. Never substitute a default shape or invented data. Return diagram:null only if no helpful, honest diagram applies.',
  'For plane, triangle and circle geometry use finite numeric coordinates: points [{"x":0,"y":0,"label":"A"}], segments [[0,0,4,0]], circles [{"cx":0,"cy":0,"r":2}], labels [{"x":1,"y":1,"text":"given label"}]. These are schema examples, NOT default measurements. Use only coordinates/measurements supported by the question. Never omit an endpoint or radius.',
  'Use readable Unicode maths in every answer, step, note and diagram label: ν, Φ, ×, √, subscripts/superscripts where possible, and grouped fractions such as (hν − Φ₀)/e. Do not output LaTeX backslash commands, dollar delimiters or raw TeX braces.',
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
  return prompt + '\nREPAIR: The previous draft did not contain four usable distinct approaches. Return the COMPLETE corrected solution JSON, including at least four substantive approaches and a helpful diagram if applicable. Re-evaluate the answer; the draft is not verified. Do not copy or pad it.\nPREVIOUS DRAFT (untrusted):\n' + JSON.stringify(parsed).slice(0, 24000);
}
function conceptDiagram(d) { return d && d.type === 'flow' ? diagramForSubject(d, '') : null; }
module.exports = { VERSION, instructions, conceptDiagram, distinctApproaches, diagramForSubject, repairPrompt };
