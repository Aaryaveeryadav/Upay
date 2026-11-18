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
const shred = bank.find(q => q.id === 'sscp-3211-11');
assert(shred && qq.testReadyIssue(shred) === 'broken-options', 'shredded match-column record must be gated as broken-options');

// A complete theorem does not need an equals sign. Do not release coordinate
// corruption, dropped radicals, truncated or joined papers alongside it.
for (const id of ['imp908923153','o6','r4','n16','s3_8','lg15538917','y2085465513'])
  assert.equal(qq.testReadyIssue(bank.find(q=>q.id===id)), '', 'intact proof: '+id);
for (const id of ['imp11086724','imp90892394','y24430-B-q27','rbse-s09-2025b-q33','rbse-p09-2020s-q25'])
  assert.equal(qq.testReadyIssue(bank.find(q=>q.id===id)), 'broken-identity', 'suspect proof: '+id);
for (const en of ['Prove that 3√4 is irrational.', 'Prove that √ is irrational.', 'Prove that 1/√3 is irrational, given that √5 is irrational.'])
  assert.equal(qq.testReadyIssue({en}), 'broken-identity', en);

/* Exercise the actual upstream gate, not just the per-option validator. A
   short value isn't a page number, and a fifth source choice isn't debris. */
const choiceRow = { kind: 'mcq', subject: 'maths', en: 'Choose the correct value:' };
const five = ['0', '1', '−1', '1/2', '2'];
for (const opts of [five, ['red', 'blue', 'green', 'black', 'white'],
  ['State Bank of India', 'State Bank of Mysore', 'Indian Bank', 'Union Bank', 'Indian Overseas Bank'],
  ['A', 'B', 'C', 'D', 'E', 'F'].map(en => ({ en }))]) {
  assert.equal(qq.testReadyIssue({ ...choiceRow, opts }), '', 'keep every clean source choice: ' + JSON.stringify(opts));
}
assert.equal(qq.boardKeyAdmission({ stem: choiceRow.en, opts: five, key: 'a' }), -1,
  'showing five choices must not admit a key from the four-choice printed table');
for (const opts of [five.concat('3', '4'), [...five, ''], [...five, '−1'], [...five, '/S 9'],
  [...five, 'Choose the correct option:'], [...five, 'Q. 12. Explain the result.'],
  [...five.slice(0, 4), 'What is the mass of the block?'],
  ['Name two factors.', 'Describe the process.', 'Yes', 'No', 'Sometimes'],
  ['Column I', 'Column II', 'Iron ore', 'Mica', 'Gaya']]) {
  assert.equal(qq.testReadyIssue({ ...choiceRow, kind: 1, opts }), 'broken-options', 'hold damaged choices: ' + JSON.stringify(opts));
}
assert.equal(qq.testReadyIssue({ ...choiceRow, opts: five, raw: { optionReview: 'awaiting-source-review' } }), 'broken-options');
// Real imports with five/six nonempty, distinct strings, but not five/six answers.
for (const id of ['sscp-3221-9', 'sscp-3241b-7', 'sscp-3251b-10', 'sscp-32S1-35', 'sscp-32S2v-6', 'scp-31BS-39']) {
  const q = bank.find(row => row.id === id);
  assert(q && qq.testReadyIssue(q) === 'broken-options', id + ': instruction, split word, subquestion or footer in choices');
}
const added2025 = bank.filter(q => /^sscp-32\d{3}-\d+x?$/.test(q.id) && q.y === 2025 && q.kind === 'mcq');
assert(added2025.length >= 30, 'official 2025 Social MCQs extracted from the supplied papers must be in the bank');
/* Board-key admission: printed CBSE keys grade only when the row is clean. */
const keyTable = ctx.UP.pyqMCQ || [];
assert(Array.isArray(keyTable) && keyTable.length >= 40, 'board-key table must be loaded');
const printedRow = { stem: 'Choose the correct answer:', opts: ['one', 'two', 'three', 'four'] };
for (const key of [undefined, null, '', '  ', 'ab', 'BC', 'abcd', 'E', 0, ['a']]) {
  assert.equal(qq.boardKeyAdmission({ ...printedRow, key }), -1, `reject malformed printed key ${JSON.stringify(key)}`);
}
for (const [i, key] of ['a', ' B ', 'c', 'D'].entries()) assert.equal(qq.boardKeyAdmission({ ...printedRow, key }), i);
const admittedRows = keyTable.filter(r => qq.boardKeyAdmission(r) >= 0);
assert(admittedRows.length >= 15, 'at least 15 board-key rows must pass strict admission, got ' + admittedRows.length);
const damagedRow = keyTable.find(r => r.paper === '430/2/1' && r.q === 3);
assert(damagedRow && qq.boardKeyAdmission(damagedRow) === -1, 'damaged board-key row (430/2/1 Q3) must stay ungraded');
for (const id of ['imp1108670', 'imp1108671', 'imp1108675', 'imp1108676', 'imp11086711']) {
  const rec = bank.find(q => q.id === id);
  assert(rec && rec.keyVerified === true && /^[a-d]$/.test(rec.ans || ''), id + ' must carry its verified board key');
}
console.log('PASS board-key admission: ' + admittedRows.length + '/' + keyTable.length + ' printed keys trusted, damaged rows withheld');
console.log('PASS reported half-questions: sequence/minus restored, fragment gated');
console.log('PASS question-text audit: reported questions fixed/gated, whole bank scanned');
