/* Text transcription and separately printed board keys, never inferred. */
const assert = require('node:assert/strict');
global.window = global;
require('../../assets/js/data/pyq-social.js');
const scanned = require('./fixtures/social-2023-3261.json');
const set5 = require('./fixtures/social-2023-3251-checked.json');
const yearMatches = require('./fixtures/social-2023-year-matches.json');
const keys = require('./fixtures/social-2023-board-keys.json');
require('../../assets/js/question-quality.js');
const byId = new Map(keys.map(k => [k.id, k]));
assert.equal(byId.size, 28);
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
  const key = byId.get(id);
  assert(key, id);
  assert.equal(q.ans, key.key, id);
  assert.equal(q.keyVerified, true, id);
  assert.equal(q.opts['ABCD'.indexOf(key.key)].en, key.keyText, id);
  assert.equal(q.keyPage, key.keyPage, id);
  assert.match(q.keySource, /^https:\/\/cdn\.savemyexams\.com\//, id);
  assert.equal(UP.questionQuality.testReadyIssue(q, q.subject), '', id);
  assert.equal(UP.questionQuality.optionIssue(q.opts, q.subject), '', id);
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
  if (!byId.has(e.id)) assert.notEqual(q.keyVerified, true, e.id);
}
console.log('PASS: 28 printed board keys, source text/options, and 49 paper/year matches; no inferred keys');
