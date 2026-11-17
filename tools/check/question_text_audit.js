'use strict';
/* Whole-bank question-text audit: loads every pack the way curation does and
   reports questions that are not test-ready (missing figure, truncated start,
   marks/extraction debris, broken identities, damaged text). Test and mock
   pools exclude these via UP.questionQuality.testReadyIssue; this audit makes
   sure the two reported broken questions — and their whole class — stay out. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..', '..');
const ctx = { window: {}, console, setTimeout: () => 0 };
ctx.window = ctx; ctx.document = {}; ctx.self = ctx;
vm.createContext(ctx);
const run = rel => { const f = path.join(ROOT, rel); if (fs.existsSync(f)) { try { vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: rel }); } catch (e) { console.error('load failed:', rel, e.message); } } };
[
  'assets/js/data-extra.js', 'assets/js/data/chapters1.js', 'assets/js/data/chapters2.js', 'assets/js/data/pyq.js', 'assets/js/data/pyq-2024.js', 'assets/js/data/pyq-keys.js', 'assets/js/data/mcq-keyed.js',
  'assets/science/science10.js', 'assets/js/data/science10-q.js', 'assets/js/data/pyq-science.js',
  'assets/js/data/social10-q.js', 'assets/js/data/pyq-social.js',
  'assets/js/data/hindi10-q.js', 'assets/js/data/hindi10-rich.js',
  'assets/js/data/english10.js', 'assets/js/data/pyq-english.js', 'assets/js/data/mcq-english.js',
  'assets/sanskrit/sanskrit10-q.js', 'assets/sanskrit/pyq-sanskrit.js',
  'assets/js/data/physics12.js', 'assets/js/data/pyq-physics-2025.js',
  'assets/js/data/chemistry12.js', 'assets/js/data/rbse.js',
  'assets/js/question-quality.js'
].forEach(run);

const bank = ctx.UP.pyq || [];
const qq = ctx.UP.questionQuality;
assert(qq && typeof qq.testReadyIssue === 'function', 'testReadyIssue must be exported');

const byReason = {};
for (const q of bank) {
  const issue = qq.testReadyIssue(q);
  if (issue) { (byReason[issue] = byReason[issue] || []).push(q.id); }
}
const total = Object.values(byReason).reduce((a, b) => a + b.length, 0);
console.log(`audited ${bank.length} questions; not test-ready: ${total}`);
for (const [reason, ids] of Object.entries(byReason).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${reason}: ${ids.length}  e.g. ${ids.slice(0, 5).join(', ')}`);
}

/* The two questions reported from the mock test must be fixed or gated. */
const trig = bank.find(q => q.id === 'y24430-2-1-q30');
assert(trig && /tan θ\/\(1 − cot θ\) \+ cot θ\/\(1 − tan θ\) = 1 \+ sec θ cosec θ/.test(trig.en), 'trig identity must be restored with brackets');
assert.equal(qq.testReadyIssue(trig), '', 'restored trig identity must be test-ready');
const trig2 = bank.find(q => q.id === 'y24430-2-2-q28');
assert(trig2 && !/AB\/\d+/.test(trig2.en), 'extraction debris must be removed from the second trig row');
assert.equal(qq.testReadyIssue(trig2), '', 'second trig row must be test-ready');
const sticks = bank.find(q => q.id === 'y24430-3-1-q36b');
assert(sticks && qq.testReadyIssue(sticks), 'figure-dependent sticks question must be gated out of tests');

/* Reported half-questions: A.P. sequence, minus sign, Assertion-Reason fragment. */
const ap = bank.find(q => q.id === 'imp1108670');
assert(ap && /14, 19, 24, 29/.test(ap.en), 'A.P. question must keep its sequence');
assert.equal(qq.testReadyIssue(ap), '', 'complete A.P. question must be test-ready');
const ratio = bank.find(q => q.id === 'imp1108671');
assert(ratio && /A\(2, −3\)/.test(ratio.en), 'ratio question must keep the minus sign (A(2, -3))');
assert.equal(qq.testReadyIssue(ratio), '', 'restored ratio question must be test-ready');
const frag = bank.find(q => q.id === 'imp11086716');
assert(frag && qq.testReadyIssue(frag) === 'fragment', 'lone Reason (R) fragment must be gated out');
console.log('PASS reported half-questions: sequence/minus restored, fragment gated');
console.log('PASS question-text audit: reported questions fixed/gated, whole bank scanned');
