/* Structural regression only: does not certify textbook maths or answer keys. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const UP = {pyq: []};
const ctx = vm.createContext({UP, window: {UP}});
for (const name of ['physics12', 'pyq-physics-2025']) {
  vm.runInContext(fs.readFileSync(`assets/js/data/${name}.js`, 'utf8'), ctx);
}
const ledger = JSON.parse(fs.readFileSync('assets/notes/physics-question-quality.json'));
assert.equal(ledger.questions.length, 1181);
assert.equal(UP.pyq.length, ledger.counts['structurally-screened']);
assert.equal(new Set(UP.pyq.map(q => q.id)).size, UP.pyq.length);
for (const id of ['phys25-554-s2-q16', 'phys25-552-s3-q05']) {
  assert(!UP.pyq.some(q => q.id === id), `${id}: damaged reported row leaked`);
  assert(ledger.originalRows[id].en.length > 100, 'original text lost');
  assert.equal(ledger.questions.find(q => q.id === id).status, 'withheld');
}
for (const q of UP.pyq) {
  assert.equal(q.qualityStatus, 'structurally-screened');
  assert.equal(q.ans, '');
  assert.equal(q.keyVerified, false);
  assert(!q.hi, `${q.id}: unreviewed Hindi leaked`);
  assert(!/[\ue000-\uf8ff\x00-\x08\x0b\x0c\x0e-\x1f]/.test(q.en), q.id);
  assert(!/Questions? number|SECTION [A-E]|H\$|\{Z|osQ|dhft/i.test(q.en), q.id);
  if (q.kind === 2) {
    assert(/^Assertion\s*\(A\)/.test(q.en), q.id);
    assert(/Reason\s*\(R\)/.test(q.en), q.id);
    assert.equal(q.opts.length, 4);
    assert.equal(q.optionReview, 'same-paper-instructions');
  }
  if (q.kind === 1) assert.equal(q.opts.length, 4);
}
assert(UP.pyq.filter(q => q.kind === 2).length >= 29);
console.log(`PASS: all 1181 Physics imports audited, ${UP.pyq.length} structurally screened rows published; reported damaged rows withheld, AR types/codes recovered, no invented keys`);
