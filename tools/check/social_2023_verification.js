/* Curated question text only: no board answers are inferred from QPs. */
const assert = require('node:assert/strict');
global.window = global;
require('../../assets/js/data/pyq-social.js');
const scanned = require('./fixtures/social-2023-3261.json');
const set5 = require('./fixtures/social-2023-3251-checked.json');
const yearMatches = require('./fixtures/social-2023-year-matches.json');
const normalize = s => String(s).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '');
function checked(id, entry, set) {
  const rows = UP.socialPyq.filter(q => q.id === id && q.kind === 'mcq');
  assert.equal(rows.length, 1, id);
  const q = rows[0];
  assert.equal(q.y, 2023, id);
  assert.equal(q.set, set, id);
  assert.equal(q.q, entry.q, id);
  assert.equal(q.en, entry.stem, id);
  assert.deepEqual(q.opts.map(o => o.en), entry.opts, id);
  assert.equal(new Set(entry.opts).size, 4, id);
  assert.equal(q.textReview, 'source-verified', id);
  assert.equal(q.ans, '', id);
  assert.notEqual(q.keyVerified, true, id);
}
assert.equal(scanned.length, 20);
for (const e of scanned) checked(`sscp-2023-3261-${e.q}`, e, '32/6/1');
assert.equal(set5.length, 8);
for (const e of set5) checked(e.q === 5 ? 'sscp-2023-3251-5' : `sscp-3251b-${e.q}`, e, '32/5/1');
// These are paper/position + extracted-text matches, not claims that every
// glyph in the PDF text layer is intact or that an answer key was verified.
assert.equal(yearMatches.length, 49);
for (const e of yearMatches) {
  const candidates = UP.socialPyq.filter(q => q.id === e.id && q.kind === 'mcq');
  assert.equal(candidates.length, 1, e.id);
  const q = candidates[0];
  assert.equal(q.y, 2023, e.id);
  assert.equal(q.set, `32/${e.series}/${e.set}`, e.id);
  assert.equal(q.q, e.q, e.id);
  assert.equal(normalize(q.en), normalize(e.stem), e.id);
  assert.deepEqual(q.opts.map(o => normalize(o.en)), e.opts.map(normalize), e.id);
  assert.notEqual(q.keyVerified, true, e.id);
}
console.log('PASS: 21 source-text additions, seven checked 2023 rows, 49 paper/year matches and no inferred keys');
