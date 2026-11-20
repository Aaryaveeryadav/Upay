/* A long question, answered in parts.

   The failure this pins: a big/complex question outran one request's budget,
   so the student got "The AI took too long to answer" and nothing else. Now the
   answer is fetched as `core` (answer + first method) and then one `approach`
   per request, merged into a single answer as parts arrive. This file tests the
   merge state machine on its own — request shape, de-duplication, the banner,
   and the fact that a missing part never removes the answer.

   No browser, no provider, no bank data. */
'use strict';
const assert = require('node:assert/strict');
const P = require('../../assets/js/solve-parts.js');

const step = (name, text) => ({ name: name, tag: 'when to use it', steps: [{ t: text, m: 'x = 1' }] });
const base = { question: 'A long multi-part question', subject: 'physics', cls: 12, lang: 'en' };

/* ---------------------------------------------------- the request sequence */

const s = P.create(base.question);
const first = P.next(s, base);
assert.equal(first.part, 'core', 'the first request asks for the answer and one method');
assert.equal(first.question, base.question);
assert.equal(P.next(s, base).part, 'core', 'still core until something arrives');

P.absorb(s, {
  result: 'The settled answer', summary: 'What the question asks',
  approaches: [step('First principles', 'Start from the definition')],
  check: { state: 'unchecked' }
});
assert.equal(P.have(s), 1);
assert.equal(P.next(s, base).part, 'approach');
const second = P.next(s, base);
assert.equal(second.index, 2);
assert.deepEqual(second.taken, ['First principles']);
assert.equal(second.core.answer, 'The settled answer');

P.absorb(s, { approaches: [step('Energy method', 'Use conservation of energy')] });
assert.equal(P.have(s), 2);
assert.equal(P.next(s, base).index, 3);

/* --------------------------------------------------------- de-duplication */

const dup = P.absorb(s, { approaches: [step('first PRINCIPLES', 'Start from the definition')] });
assert.equal(dup, 0, 'a method already shown is not added twice');
assert.equal(P.have(s), 2);
assert.equal(s.failed, 1, 'and the failed slot is counted, so the next request moves on');
assert.equal(P.absorb(s, {approaches:[step('Renamed', 'Start from the definition')]}), 0, 'renamed identical work is not another approach');

P.absorb(s, { approaches: [step('Graphical check', 'Read the intercept')] });
P.absorb(s, { approaches: [step('Verification', 'Substitute back')] });
assert.equal(P.have(s), 4);
assert.equal(P.next(s, base), null, 'nothing more to ask for once four are shown');
assert.match(P.status(s, 'en'), /4 of 4 methods came back/,
  'a complete split answer still says it arrived in parts');

/* ------------------------------------------- the answer survives a failure */

const cut = P.create(base.question);
P.absorb(cut, { result: 'Answer', approaches: [step('Only method', 'Working')] });
P.next(cut, base);
cut.failed += 1;                                   /* the part timed out */
P.absorb(cut, { approaches: [] });
assert.equal(P.answer === null, false);
assert.equal(cut.answer.result, 'Answer', 'a lost part never removes the settled answer');
assert.equal(P.have(cut), 1);
P.finish(cut);
const banner = P.status(cut, 'en');
assert.match(banner, /1 of 4/);
assert.match(banner, /requested again/);
assert.match(P.status(cut, 'hi'), /1/);

/* A seed answer (the "request the missing methods" button) resumes, not restarts. */
const resumed = P.create(base.question, cut.answer);
assert.equal(P.have(resumed), 1);
const nextResumed = P.next(resumed, base);
assert.equal(nextResumed.part, 'approach');
assert.equal(nextResumed.index, 2);

/* A part that carries the answer first (core) sets the check and summary. */
const fresh = P.create(base.question);
P.absorb(fresh, {
  result: '42 m', summary: 'Height of the tower', verify: 'Substitute back',
  check: { state: 'unchecked' },
  approaches: [step('Trigonometry', 'tan 30° = h/30')]
});
assert.equal(fresh.answer.result, '42 m');
assert.equal(fresh.answer.summary, 'Height of the tower');
assert.equal(fresh.answer._parts.have, 1);
assert.equal(fresh.answer._parts.want, 4);
assert.equal(fresh.answer._partial, true);

/* Two misses in a row end the loop: the client must not keep asking. */
const stop = P.create(base.question);
P.absorb(stop, { result: 'Answer', approaches: [step('One', 'w')] });
stop.failed = 2;
assert.equal(P.have(stop), 1, 'the answer survives the misses');
assert.equal(stop.answer.result, 'Answer');

/* Later parts must not overwrite the settled answer with a different one. */
P.absorb(fresh, { result: 'something else', approaches: [step('Similar triangles', 'Ratio')] });
assert.equal(fresh.answer.result, '42 m', 'the settled answer wins');

console.log('PASS split answers: core then one approach per request, methods de-duplicated by name, ' +
  'the banner counts what arrived, a lost part keeps the answer, and the retry resumes instead of restarting');
