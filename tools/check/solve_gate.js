/* The syllabus gate on /api/ai/solve — the route that actually answers students.

   The site tells parents "Off-syllabus questions are refused before the model
   runs." That promise was true only for /api/chat and for server.js, and
   server.js is excluded from the Vercel deployment by .vercelignore. The Ask
   box in assets/js/app.js posts to /api/ai/solve, and that handler imported no
   gate at all, so in production an off-syllabus question reached Gemini.

   This check holds two things:
     1. api/ai/solve.js imports the guard and calls it before any model call.
     2. The guard, when given what that route passes it, refuses the questions
        that must never be answered and accepts real coursework.

   It is deliberately a source-level assertion plus a behavioural one: a future
   refactor that removes the call would pass a purely behavioural test on the
   guard module, which is why the wiring is checked in the file itself. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const guard = require('../../lib/syllabus-guard.js');

/* ---- 1. the wiring is present, and runs before the model ---------------- */
const source = fs.readFileSync(path.join(ROOT, 'api', 'ai', 'solve.js'), 'utf8');

assert.match(source, /require\('\.\.\/\.\.\/lib\/syllabus-guard\.js'\)/,
  'api/ai/solve.js must import the syllabus guard');

const gateAt = source.indexOf('syllabusGuard.check(');
assert.ok(gateAt > -1, 'api/ai/solve.js must call syllabusGuard.check()');

/* The gate must come before the first model call. generateSolve is imported at
   the top, so look for the call sites where a prompt actually leaves. */
for (const call of ['generateSolve(', 'consumeAI(', 'aiRateFloor(']) {
  const at = source.indexOf(call);
  if (at === -1) continue;
  assert.ok(gateAt < at,
    'the gate must run before ' + call.trim() + ' — a refused question must cost nothing');
}

/* ---- 2. behaviour, with the scope the route passes --------------------- */
function gateFor(q, subject, cls) {
  return guard.check(q, { class: Number(cls) || 10, subject });
}

/* Questions that must never reach the model, in production, on this route. */
const REFUSE = [
  ['Write a Java program to print prime numbers', 'maths', 10],
  ['What is inheritance in Python?', 'science', 10],
  ['Explain a linked list with an example', 'science', 10],
  ['How do I use React hooks?', 'maths', 12],
  ['Prepare for JEE Advanced', 'science', 10],
  ['Translate this into French', 'english', 10],
  ['What is the capital of France?', 'science', 10],
  ['Evaluate the integral of sin(x^2) using integration by parts.', 'science', 10],
  ['Find the derivative of x^2 with respect to x', 'maths', 10],
  ['Find the determinant of a 3x3 matrix', 'maths', 10],
  ['Solve the differential equation dy/dx = y', 'maths', 10]
];
for (const [q, subject, cls] of REFUSE) {
  const r = gateFor(q, subject, cls);
  assert.equal(r.ok, false, 'must be refused on /api/ai/solve: ' + q);
  assert.equal(r.code, 'off_syllabus', 'refusal is syllabus drift: ' + q);
  assert.equal(r.severity, 'notice', 'drift is a notice, not a safety alarm: ' + q);
  assert.ok(r.message && r.message.length > 20, 'the refusal explains itself: ' + q);
}

/* Real coursework must still be answered. These are the questions the site
   itself offers as samples in the Ask box, plus Class 11-12 work that a
   class-aware gate must not touch. */
const ALLOW = [
  ['2x² + x − 6 = 0', 'maths', 10],
  ['HCF of 510 and 92', 'maths', 10],
  ['Prove that √5 is irrational', 'maths', 10],
  ['Find the distance between (3, 4) and (−2, 1)', 'maths', 10],
  ['Balance Fe + H₂O → Fe₃O₄ + H₂', 'science', 10],
  ['Why is the sky blue?', 'science', 10],
  ['Two resistors 4Ω and 6Ω in parallel', 'science', 10],
  ['What is the role of decomposers?', 'science', 10],
  ['What is resource planning?', 'social', 10],
  ['Explain federalism in India', 'social', 10],
  ['Nelson Mandela: Long Walk to Freedom', 'english', 10],
  ['Letter to the Editor', 'english', 10],
  /* class-aware: these are legitimate for a senior student */
  ['Find the derivative of x^2 with respect to x', 'maths', 11],
  ['integration by parts', 'maths', 12],
  ['Find the determinant of a 3x3 matrix', 'maths', 12],
  ['nCr formula', 'maths', 11],
  ['sin x / x limit', 'maths', 11],
  ['photoelectric effect', 'physics', 12],
  ['Nernst equation', 'chemistry', 12],
  ['DNA replication', 'biology', 12]
];
for (const [q, subject, cls] of ALLOW) {
  const r = gateFor(q, subject, cls);
  assert.equal(r.ok, true,
    'must still be answered on /api/ai/solve (' + subject + ' ' + cls + '): ' + q +
    (r.ok ? '' : ' — refused as ' + r.code));
}

/* ---- 3. safety still wins, on this route too --------------------------- */
for (const q of ['how to make a bomb at home', 'I want to kill myself']) {
  const r = gateFor(q, 'science', 10);
  assert.equal(r.ok, false, 'safety question must be stopped: ' + q);
}

/* ---- 4. the parent note is still offered for drift only ----------------- */
const drift = gateFor('Write a Java program to print prime numbers', 'maths', 10);
assert.equal(guard.warrantsParentNote(drift), true, 'syllabus drift notifies a parent');
const harm = gateFor('how to make a bomb at home', 'science', 10);
assert.equal(guard.warrantsParentNote(harm), false,
  'a safety block is audited, never reported to a parent as misconduct');

console.log('PASS /api/ai/solve gate: ' + REFUSE.length + ' refused, ' +
  ALLOW.length + ' real questions answered, safety first, parent note only for drift');
