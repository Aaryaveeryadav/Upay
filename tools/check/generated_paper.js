'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const quality = require('../../assets/js/question-quality');
const UP = {};
vm.runInNewContext(fs.readFileSync(require.resolve('../../assets/js/testgen'), 'utf8'), { UP, window:{ UP } });
const gen = UP.testgen;

// Replay the original collision even if the generator now makes better distractors.
const oldChoices = ['−44', '−36', '4·0', '−40'];
assert.equal(quality.choiceIndex(oldChoices, '-40'), 3);
assert.equal(quality.choiceIndex(oldChoices, '4·0'), 2);
for (const opts of [['+2', '−2', '2²', '22'], ['x₁', 'x1', '1/2', '12'], ['x+y', 'x−y', 'x·y', 'xy']]) {
  opts.forEach((v, i) => assert.equal(quality.choiceIndex(opts, v), i));
}
assert.equal(quality.choiceIndex([{en:'one',hi:'एक'}, {en:'two',hi:'एक'}], 'एक'), -1, 'ambiguous translation');
assert.equal(quality.choiceIndex(['−1','-1','2','3'], '-1'), -1, 'ambiguous minus variants');
assert.equal(quality.choiceIndex(['red','blue','green','A'], 'A'), -1, 'ambiguous text vs positional key');
assert.equal(quality.choiceIndex(['1','2','3','4'], '(B'), -1, 'broken positional key');
const ap = gen.paper({seed:67}).sections[0].questions[4];
assert.equal(ap.tid, 'ap-nth');
assert.equal(ap.raw.a + (ap.raw.n - 1) * ap.raw.d, -40);
assert.equal(ap.opts[quality.choiceIndex(ap.opts, ap.ans)].en, '−40');

const hcf = gen.paper({seed:1, chapters:[1]}).sections[0].questions[1];
assert.deepEqual([hcf.tid, hcf.raw.a, hcf.raw.b, hcf.ans], ['hcf-lcm', 63, 91, '798']);
for (const lang of ['en', 'hi']) {
  const steps = hcf.steps.map(s => s[lang]).join('\n');
  assert.match(steps, /819 − 3×7 = 798/);
  assert.doesNotMatch(steps, /\b(?:28|49|196|175)\b/);
}
for (const board of ['cbse','icse','rajasthan']) {
  const p = gen.paper({board, seed:1});
  const marks = p.sections.flatMap(s => s.questions).reduce((a,q) => a + q.marks, 0);
  assert.equal(p.total, marks);
  assert(p.title.en.includes(`${marks} marks`) && p.title.hi.includes(`${marks} अंक`));
}
// Check the displayed equations, not just that a template repeats its own key.
function checkEquation(id, q) {
  if (id === 'trig-angle') {
    const [,c,k,form,rhs] = q.en.match(/(\d+) \+ (\d+) (sin|cos) θ = ([^,]+),/);
    const sides = rhs.split(' + ');
    let value = Number(sides[0]);
    if (sides[1]) { const [mult, rad] = sides[1].split('√'); value += Number(mult || 1) * Math.sqrt(Number(rad)); }
    assert(Math.abs(value - (Number(c) + Number(k) * Math[form](parseInt(q.ans) * Math.PI / 180))) < 1e-9, q.en);
  } else if (id === 'area-arc') {
    const [,num,den,r] = q.en.match(/wire (\d*)π(?:\/(\d+))? cm .*radius (\d+) cm/);
    assert.equal(180 * Number(num || 1) / Number(den || 1) / Number(r), parseInt(q.ans));
  } else if (id === 'circ-angle') {
    assert.equal(90 - Number(q.en.match(/∠AOB = (\d+)°/)[1]) / 2, parseFloat(q.ans));
    assert(q.steps.some(s => s.en.includes('OP bisects ∠AOB')));
  } else if (id === 'poly-zeroes') {
    const [,n,d] = q.steps.at(-1).en.match(/sum = (-?\d+)(?:\/(\d+))?/);
    assert(Math.abs(Number(n) / Number(d || 1) - (q.raw.r1n / q.raw.r1d + q.raw.r2)) < 1e-10);
  } else if (id === 'solid-balls') {
    const [,n,d] = q.ans.match(/^\(?(\d+)(?:\/(\d+))?\)?πr³$/);
    assert.equal(3 * Number(n), 2 * q.raw.n * Number(d || 1));
  }
}
let checked = 0;
for (const t of gen.templates) {
  const rng = gen._rng(67);
  for (let i=0; i<200; i++) {
    const q = t.make(rng, t.dmin);
    checkEquation(t.id, q);
    assert(q.steps.length && q.steps.every(s => s.en && s.hi), t.id + ': missing instance workings');
    if (!q.opts) continue;
    assert.equal(q.opts.length, 4, t.id + ': not enough distractors');
    const index = quality.choiceIndex(q.opts, q.ans);
    assert(index >= 0 && q.opts[index].en === q.ans, t.id + ': key must identify the exact displayed option');
    assert(!q.opts.some(o => /^[1-4]·0$/.test(o.en)), t.id + ': no zero-product filler');
    checked++;
  }
}
console.log(`PASS seed 67 signed key, seed 1 bilingual workings, actual totals on three boards, ${checked} generated choice sets`);
