/* One gate in front of every model call.

   The screenshots on the site promise "Off-syllabus questions are refused
   before the model runs." That promise was true only for /api/chat: the
   main solver, /api/ai/solve, never called guardQuestion, so a Class 10
   Science student could ask about Java inheritance and be answered.

   This module is the single place that decides three things:

     1. Is this inside the student's syllabus? (subject + class vocabulary)
     2. Is this harmful to the student? (self-harm, drugs, weapons, abuse)
     3. Is this an attempt to break the model instead of ask it a question?

   It never calls a model to decide. Everything here is local and cheap, so a
   refused question costs nothing and cannot be talked around by prompt
   injection: the check runs on the raw text before any prompt is built.

   The three answers are deliberately separate, because a parent warning is
   not the same event as a safety block:
     - off-syllabus  -> maybe worth telling a parent (a student searching
                        outside their course), never a safety alarm
     - safety        -> never shown to the student as a refusal that hides why,
                        and always recorded
     - too short / greeting / nothing usable -> not recorded as anything
*/
'use strict';

const path = require('path');

/* Reuse the reviewed vocabulary and off-topic list rather than growing a
   second copy that will drift out of step with the first. */
let llm = null;
try { llm = require('./local-llm.js'); } catch (_) { llm = null; }

/* --------------------------------------------------------------- safety ---- */

/* Categories a school platform must not answer, whatever the subject. Each
   carries its own sentence: a student who asks about self-harm deserves care,
   not a lecture about the syllabus. */
const SAFETY = [
  {
    code: 'self_harm',
    re: /\b(kill(ing)? (myself|himself|herself|themselves)|suicid\w*|self[- ]?harm|cut(ting)? myself|end my life|want to die|no reason to live|hurt myself)\b|आत्महत्या|खुद को मार/i,
    message: 'I am not able to help with this, and I do not want to guess at how you are feeling. Please talk to a parent, a teacher, or someone you trust today. In India you can call the Tele-MANAS helpline on 14416, at any hour, free of charge.',
    severity: 'urgent'
  },
  {
    code: 'sexual',
    re: /\b(porn\w*|explicit sex|sexual (intercourse|content|act)|nude|naked (photo|pic|image)s?|sexting|child sexual)\b/i,
    message: 'That is not something this site will answer. Please ask an adult you trust if you have a question about it.',
    severity: 'block'
  },
  {
    code: 'weapons_drugs',
    re: /\b(how to (make|build|synthesi[sz]e|cook|prepare)|make a|build a)\b.{0,60}\b(bomb|explosive|gun|firearm|poison|meth|drug|tnt|napalm)\b|\b(synthesi[sz]e|manufacture|extract)\b.{0,40}\b(meth(amphetamine)?|fentanyl|heroin|cocaine|poison)\b|\b(terrorist|jihadi|join (isis|is|al[- ]qaeda)|carry out an attack)\b/i,
    message: 'I cannot help with this. It is not school work and I will not give instructions for it.',
    severity: 'block'
  },
  {
    code: 'abuse',
    re: /\b(child porn|groom(ing)?|stalk(ing)? (someone|a (girl|boy))|revenge porn|blackmail (someone|him|her))\b/i,
    message: 'I will not help with this. If someone is doing this to you, tell a trusted adult.',
    severity: 'block'
  },
  {
    code: 'prompt_injection',
    re: /\b(ignore|disregard|forget)\b.{0,30}\b(all )?(the )?(previous|above|prior|your) (instructions?|rules?|prompts?|context)\b|\byou are now\b|\bsystem prompt\b|\bact as (a|an) (unrestricted|jailbroken|dan)\b|\b(give|show|print|reveal)\b.{0,20}\b(your|the) (system )?(prompt|instructions)\b/i,
    message: 'I only answer questions from your course. Ask me something from your book or a previous-year paper.',
    severity: 'block'
  }
];

/* --------------------------------------------------------------- syllabus -- */

/* A subject the site does not teach at all. These are the words a student
   would use for a different course, so they are refused whatever they pick. */
const OFF_CURRICULUM = [
  { code: 'programming', re: /\b(java|javascript|python|c\+\+|c#|php|ruby|golang|kotlin|swift|rust|typescript|html|css|react|angular|node\.?js|sql|mysql|mongodb|docker|kubernetes|git|github|linux|ubuntu|windows|android|ios|api|json|regex|algorithm|data structure|linked list|binary tree|compiler|debug|code|coding|program|programming|software|app development|machine learning|artificial intelligence|neural network|deep learning|blockchain|web development|full stack|backend|frontend)\b/i,
    label: 'computer science and programming' },
  { code: 'competitive', re: /\b(jee|neet|iit|bitsat|gate exam|cat exam|upsc|ssc|bank po|clat)\b/i,
    label: 'competitive exam preparation' },
  { code: 'other_language', re: /\b(french|german|spanish|japanese|chinese|korean|arabic|russian|portuguese|italian) (language|grammar|translation|vocabulary|speak|learn)|translate (this )?(to|into) (french|german|spanish|japanese|chinese|korean|arabic|russian)\b/i,
    label: 'a language this site does not teach' }
];

const SUBJECT_LABEL = {
  maths: 'Mathematics', 'applied-maths': 'Applied Mathematics', science: 'Science',
  physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology',
  english: 'English', hindi: 'Hindi', 'hindi-core': 'Hindi Core',
  'hindi-elective': 'Hindi Elective', social: 'Social Science',
  accountancy: 'Accountancy', economics: 'Economics',
  'business-studies': 'Business Studies', sanskrit: 'Sanskrit'
};

const CLASS_RANGE = { 10: 'Class 10', 11: 'Class 11', 12: 'Class 12' };

function subjectLabel(subject) { return SUBJECT_LABEL[String(subject || '')] || 'your subject'; }

/* Tokens that carry no subject meaning. Kept deliberately small: the point of
   the vocabulary test is to notice that none of the words belong, so removing
   too much would let anything through. */
const STOP = new Set(('the a an and or but if then than that this these those is are was were be been being ' +
  'do does did done can could should would will shall may might must have has had ' +
  'what why how when where who whom which whose ' +
  'i me my we our you your he she it they them their his her its ' +
  'in on at to from for with without about into over under between among during ' +
  'of as by not no nor so such very too also just only more most less least ' +
  'find calculate solve explain describe define state give write show prove derive ' +
  'value values answer question please step steps method methods way ways ' +
  'example examples help tell need want know use used using ' +
  'difference differences meaning means definition define ' +
  'class chapter exercise page book textbook note notes ' +
  'number numbers following correct option options choose true false statement statements').split(/\s+/));

function asciiTokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+\-#.\s]/g, ' ')
    .split(/\s+/)
    .map(t => t.replace(/^[.\-#]+|[.\-#]+$/g, ''))
    .filter(t => t.length >= 2 && !STOP.has(t) && !/^\d+$/.test(t));
}

/* A maths question can legitimately be a bare expression with no words at all
   ("x² − 5x + 6 = 0"). Treat visible mathematics as on-topic: the guard is for
   *subject* drift, not for terse questions. */
function looksMathematical(text) {
  const s = String(text || '');
  if (!/[=+\-×÷√^²³⁴⁰¹⁵⁶⁷⁸⁹\/]/.test(s)) return false;
  if (!/[0-9]/.test(s)) return false;
  /* "Java 8 features" has a digit too; require that the maths is a real share
     of the text rather than one stray number in prose. */
  const density = (s.match(/[0-9=+\-×÷√^²³×]/g) || []).length / s.length;
  return density >= 0.12 || /[xXyYzZ]\s*[\^²]\s*\d/.test(s);
}

/**
 * Check one question against one scope.
 *
 * @param {string} question  the raw text the student typed or pasted
 * @param {{class?:number|string, subject?:string}} scope
 * @returns {{ok:boolean, code:string, message:string, severity?:string,
 *            subject:string, class:number, labels?:object, tokens?:string[]}}
 */
function check(question, scope) {
  const text = String(question == null ? '' : question).replace(/\s+/g, ' ').trim();
  const subject = String((scope && scope.subject) || '').toLowerCase();
  const cls = Number((scope && scope.class) || 0) || 10;
  const base = { ok: true, code: 'ok', message: '', subject, class: cls };

  if (text.length < 3) return Object.assign({}, base, { ok: false, code: 'too_short', message: 'Type your question first.' });
  if (/^(hi|hello|hey|ok|okay|thanks|thank you|hmm|yes|no|sure|good morning|good evening)[.!]?$/i.test(text)) {
    return Object.assign({}, base, {
      ok: false, code: 'greeting',
      message: 'Ask me a question from your book or a previous-year paper — for example, "Why is a convex mirror used as a rear-view mirror?"'
    });
  }

  /* Safety first: a harmful question must never be answered just because its
     words happen to overlap the subject vocabulary. */
  for (const rule of SAFETY) {
    if (rule.re.test(text)) {
      return Object.assign({}, base, {
        ok: false, code: rule.code, severity: rule.severity, message: rule.message
      });
    }
  }

  /* A whole different course, named explicitly. */
  for (const rule of OFF_CURRICULUM) {
    if (rule.re.test(text)) {
      return Object.assign({}, base, {
        ok: false, code: 'off_syllabus', severity: 'notice',
        labels: { subject: subjectLabel(subject), cls: CLASS_RANGE[cls] || 'Class ' + cls },
        message: 'That is about ' + rule.label + ', which is not part of ' +
          (CLASS_RANGE[cls] || 'Class ' + cls) + ' ' + subjectLabel(subject) + '. ' +
          'I only answer questions from your course, so I have not sent this to the model.'
      });
    }
  }

  /* The reviewed list and vocabulary from local-llm.js. It already knows the
     difference between an English essay and a chemistry essay, and it carries
     the per-subject word lists; duplicating that here would create two guards
     that disagree. */
  if (llm && typeof llm.guardQuestion === 'function') {
    let verdict;
    try { verdict = llm.guardQuestion(text, { class: cls, subject }); } catch (_) { verdict = null; }
    if (verdict && !verdict.ok) {
      const offTopic = ['off_topic', 'greeting', 'too_short'].includes(verdict.code);
      return Object.assign({}, base, {
        ok: false,
        code: verdict.code === 'off_topic' ? 'off_syllabus' : verdict.code,
        severity: verdict.code === 'off_topic' ? 'notice' : 'none',
        labels: { subject: subjectLabel(subject), cls: CLASS_RANGE[cls] || 'Class ' + cls },
        message: verdict.message
      });
    }
    return Object.assign({}, base, { tokens: asciiTokens(text) });
  }

  /* No vocabulary available (should not happen, but fail closed rather than
     open): accept only something that is plainly mathematics. */
  if (looksMathematical(text)) return Object.assign({}, base, { tokens: asciiTokens(text) });
  return Object.assign({}, base, {
    ok: false, code: 'off_syllabus', severity: 'notice',
    labels: { subject: subjectLabel(subject), cls: CLASS_RANGE[cls] || 'Class ' + cls },
    message: 'That does not look like a question from your course. Ask about a chapter, a formula, a diagram or a previous-year question.'
  });
}

/* Does this refusal deserve a note in the parent summary? Only genuine
   syllabus drift. Safety blocks are recorded for the audit log but are not
   phrased to a parent as "your child searched for this", because a self-harm
   or abuse query is a request for help, not misconduct. */
function warrantsParentNote(result) {
  return !!result && result.ok === false && result.code === 'off_syllabus';
}

/* A short, non-alarming sentence for the parent summary. It quotes the
   question so a parent can see exactly what was asked, and says plainly that
   the answer was never generated. */
function parentNote(result, question) {
  if (!warrantsParentNote(result)) return null;
  const asked = String(question || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const who = (result.labels && result.labels.cls) || 'their class';
  const subj = (result.labels && result.labels.subject) || 'their subject';
  return 'A question was asked on ' + new Date().toISOString().slice(0, 10) +
    ' that is outside ' + who + ' ' + subj + ': "' + asked + '". ' +
    'The site refused it before the model ran, so no answer was generated.';
}

module.exports = {
  check, warrantsParentNote, parentNote, subjectLabel,
  SAFETY, OFF_CURRICULUM, looksMathematical,
  /* exported for the checks */
  _internal: { asciiTokens, STOP }
};
