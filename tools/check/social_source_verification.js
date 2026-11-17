/* Contract for the curated 2025 EFGH/S paper text; no answer keys inferred. */
const assert = require('assert');
global.window = global;
require('../../assets/js/data/pyq-social.js');
const fixture = require('./fixtures/social-2025-s.json');
assert.strictEqual(fixture.length, 36);
for (const expected of fixture) {
  const rows = UP.socialPyq.filter(q => q.id === expected.id);
  assert.strictEqual(rows.length, 1, expected.id);
  const q = rows[0];
  assert.strictEqual(q.y, 2025, expected.id);
  assert.strictEqual(q.set, `32/S/${expected.set}`, expected.id);
  assert.strictEqual(q.q, expected.q, expected.id);
  assert.strictEqual(q.en, expected.stem, expected.id);
  assert.deepStrictEqual(q.opts.map(o => o.en), expected.opts, expected.id);
  assert.strictEqual(new Set(expected.opts).size, 4, expected.id);
  assert.strictEqual(q.textReview, 'source-verified', expected.id);
  assert.strictEqual(q.ans, '', expected.id);
  assert.notStrictEqual(q.keyVerified, true, expected.id);
}
// 2026 NML5K set 1, page 5: question and option order are source text, not a key.
const nml = UP.socialPyq.find(q => q.id === 'sscp-2026-3251-1');
assert(nml && nml.y === 2026 && nml.set === '32/5/1' && nml.q === 1);
assert.strictEqual(nml.en, 'Arrange the following events in chronological order and choose the correct option : I. Salt Satyagraha II. Kheda Satyagraha III. Rowlatt Satyagraha IV. Ahmedabad Mill Workers Satyagraha Options :');
assert.deepStrictEqual(nml.opts.map(o => o.en), ['II, I, III, IV','II, IV, III, I','III, II, IV, I','II, I, IV, III']);
assert.strictEqual(nml.textReview, 'source-verified');
assert.strictEqual(nml.ans, '');
assert.notStrictEqual(nml.keyVerified, true);
// These five additions came from LKM4N, not the 2025 paper of the same code.
for (const id of ['sscp-3241-1','sscp-3241-4x','sscp-3241-10x','sscp-3242-11x','sscp-3242-20x']) {
  const row = UP.socialPyq.find(q => q.id === id);
  assert(row && row.y === 2026, id);
}
console.log('PASS: 36 Social EFGH/S source texts, four complete options, no inferred keys; LKM4N year');
