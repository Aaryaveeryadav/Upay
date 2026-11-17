'use strict';
/* Contract for the 2023-24 Hindi practice-paper audit.
 *
 * The owner supplied 18 Hindi PDFs. This check locks in what that audit
 * established, so a later pass cannot quietly claim keys the sources do not
 * print:
 *
 *   - every text-bearing upload is a *practice* paper or its "अंक योजना",
 *     not a board set, and its text layer is mechanically unfaithful
 *     (Devanagari syllables cannot begin with a dependent vowel sign);
 *   - no marking scheme has a single question paper it can be matched to,
 *     and no key is attachable;
 *   - three pairs of 2026 files are image-only scans with no text layer at
 *     all, so no question or key can be read from them without OCR, which
 *     the repository policy forbids;
 *   - no Hindi bank row carries a verified key.
 *
 * Recorded evidence: tools/check/fixtures/hindi-practice-papers-2023-24.json,
 * produced by tools/extract/hindi_practice_papers.py. Written up in
 * docs/hindi-marking-scheme-nov-2026.md.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..', '..');
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'hindi-practice-papers-2023-24.json'), 'utf8'));

const byName = Object.fromEntries(fx.files.map(f => [f.file, f]));
assert.equal(fx.files.length, 18, 'all 18 uploads must be recorded');
assert.equal(fx.bankRowsWithKey, 0, 'no Hindi bank row may carry a verified key');

/* Every file with a text layer must be unfaithful; every unfaithful one must
   say why in machine-checkable form. */
for (const f of fx.files) {
  if (!f.hasTextLayer) {
    assert.equal(f.devanagariChars, 0, `${f.file}: an image-only scan has no Devanagari text`);
    assert.equal(f.kind, 'unclassified', `${f.file}: a scan cannot be classified from its own text`);
    continue;
  }
  if (f.devanagariChars === 0) {
    /* Legacy KrutiDev typesetting: the paper has a real text layer, but every
       glyph is a Latin code point, so no Devanagari character exists to read
       and no word can begin with a Devanagari sign. */
    assert((f.latinLetters || 0) > 1000, `${f.file}: KrutiDev text layer must hold Latin glyphs`);
    assert.equal(f.kind, 'unclassified', `${f.file}: Latin-glyph text yields no Hindi structure`);
    assert.deepEqual(f.signatures, {}, `${f.file}: no Devanagari signature can fire without Devanagari`);
    continue;
  }
  assert(f.devanagariChars > 2000, `${f.file}: text layer should carry real Devanagari volume`);
  assert.equal(f.faithful, false, `${f.file}: text layer must be recorded as unfaithful`);
  assert(f.impossibleInitialWords > 0, `${f.file}: unfaithfulness must be shown by impossible word starts`);
}

/* Six 2026 files are image-only (Course B, sets 4/7/x and 4/8/x). */
const scans = fx.files.filter(f => !f.hasTextLayer);
assert.equal(scans.length, 6, 'six uploads are image-only scans');
assert.deepEqual(scans.map(f => f.pdfPages).sort((a, b) => a - b), [11, 11, 11, 16, 16, 16],
  'scans keep their printed page counts');

/* The 4/6/x paper keeps a printed code, series and set number even though its
   KrutiDev text is unreadable. */
for (const set of [1, 2, 3]) {
  const f = byName[`4-6-${set} Hindi-B.pdf`];
  assert(f, `4-6-${set} must be recorded`);
  assert.equal(f.code, `4/6/${set}`, 'printed code survives in Latin digits');
  assert.equal(f.set, set, 'printed SET number survives');
  assert.equal(f.series, 'SRQPE/C', 'printed series survives');
}

/* Classification: five question papers, four marking schemes, nine otherwise. */
const kinds = fx.files.reduce((acc, f) => (acc[f.kind] = (acc[f.kind] || 0) + 1, acc), {});
assert.deepEqual(kinds, { 'question-paper': 5, 'marking-scheme': 4, unclassified: 9 },
  'five question papers and four marking schemes');

/* Printed key counts: what each scheme actually prints, no more. */
const keys = Object.fromEntries(fx.files.filter(f => f.kind === 'marking-scheme')
  .map(f => [f.file, f.printedKeys]));
assert.deepEqual(keys, {
  'HindiA-PQMS.pdf': 44, 'HindiA-PQMS2.pdf': 44,
  'HindiB-PQMS.pdf': 44, 'HindiB-PQMS2.pdf': 45,
}, 'printed MCQ key counts per scheme');

/* Both Course A schemes cover Q1-Q10 only: the MCQ section. */
for (const f of fx.files.filter(f => f.kind === 'marking-scheme')) {
  assert(Math.max(...f.keyQuestions) <= 10, `${f.file}: keys stay inside the MCQ questions`);
}

/* No scheme may be paired with a single question paper, and nothing attaches. */
assert.equal(fx.pairs.length, 4, 'four marking schemes were tested for pairing');
for (const pair of fx.pairs) {
  assert.equal(pair.questionPaper, null, `${pair.scheme}: pairing must stay unresolved`);
  assert.equal(pair.attachable, 0, `${pair.scheme}: no key may be attached`);
  assert(pair.candidates.length >= 2, `${pair.scheme}: two printed papers carry the same session`);
  assert(pair.reasons.some(r => /not a faithful transcription/.test(r)),
    `${pair.scheme}: the text-layer reason must be recorded`);
  assert(pair.reasons.some(r => /no unique question paper/.test(r)),
    `${pair.scheme}: the pairing ambiguity must be recorded`);
  for (const c of pair.perCandidate) {
    assert.equal(c.attachable, 0, `${pair.scheme} x ${c.questionPaper}: nothing attaches`);
  }
}

/* The two Course A schemes were also compared against the one paper whose
   options could be read positionally (HindiA-PQ2): every scored slot is
   unresolved, none agreeing. This is the "consistent, not provable" note
   made mechanical - it must never turn into an attached key. */
const aPair = fx.pairs.find(p => p.scheme === 'HindiA-PQMS.pdf');
const aCand = aPair.perCandidate.find(c => c.questionPaper === 'HindiA-PQ2.pdf');
assert(aCand && aCand.attachable === 0 && aCand.unresolved > 0,
  'Course A scheme vs HindiA-PQ2 must stay unresolved');

/* The looser comparison that was run earlier, recorded so it can never be
   quoted as a key: at most 10 of 43 letters land on the best-matching option,
   and no slot reaches the 0.75 similarity needed to accept one. */
const loose = fx.looseComparison;
assert(loose, 'the loose comparison must stay on record with its verdict');
for (const c of loose.bySchemeVsPaper) {
  assert(c.letterIsBestOption <= 10,
    `${c.scheme} x ${c.paper}: chance-level agreement must stay recorded as chance`);
}
assert(/NOT evidence/.test(loose.probe), 'the loose probe must be labelled as no evidence');

/* And the bank itself: no Hindi row is marked verified. */
const ctx = { window: {}, console, setTimeout: () => 0 };
ctx.window = ctx; ctx.document = {}; ctx.self = ctx; ctx.UP = { pyq: [] };
vm.createContext(ctx);
const run = rel => { const f = path.join(ROOT, rel); if (fs.existsSync(f)) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: rel }); };
['assets/js/data/hindi10-q.js', 'assets/js/data/hindi10-rich.js',
 'assets/js/data/pyq-hindi-final.js', 'assets/js/data/pyq-hindi-a5b4.js',
 'assets/js/data/pyq-hindi-a6b5.js'].forEach(run);
run('assets/js/data/question-overrides.js');
const bank = (ctx.UP.pyq || []).filter(q => q && q.subject === 'hindi');
assert(bank.length > 1000, 'the Hindi bank must actually be loaded');
const keyed = bank.filter(q => q.keyVerified);
assert.equal(keyed.length, 0,
  'no Hindi row may be marked keyVerified without a printed, matched marking scheme');

/* Damage already present in the shipped Hindi bank (a finding, not a licence to
   add keys). A Devanagari syllable cannot begin with a dependent vowel sign or
   an anusvara, so a word that does is a font/OCR shift. The sidecar already
   withholds many damaged rows; count what is still served and ratchet it so the
   figure may shrink but never grow. */
const drop = new Set([...((ctx.UP.questionOverrides || {}).drop || []),
                      ...((ctx.UP.questionOverrides || {}).duplicates || [])]);
const served = bank.filter(q => !drop.has(q.id));
const impossibleStart = /[\u0900-\u097f\u200d]/;
const badStart = w => /[\u093e\u093f\u0940\u0941\u0942\u0943\u0944\u0947\u0948\u094b\u094c\u0902\u0903\u0901\u094d\u093c]/.test(w[0]);
const damaged = served.filter(q => {
  const words = `${q.hi || ''} ${q.en || ''}`.match(/[\u0900-\u097f\u200d]+/g) || [];
  return words.some(w => impossibleStart.test(w[0]) && badStart(w));
});
assert.equal(served.length, 930, 'curation must leave 930 Hindi rows served');
assert(damaged.length <= 45,
  `Hindi rows with an impossible word start may not exceed 45, found ${damaged.length}`);
/* Three MCQ rows carry a damaged fragment and are still offered for practice
   (none of them has a printed key, so no answer is at stake). Recorded here as
   a known, bounded defect so a new one shows up as a test failure. */
const damagedMcq = damaged.filter(q => q.kind === 'mcq').map(q => q.id).sort();
assert.deepEqual(damagedMcq,
  ['hbp26v2-4b26v213-702', 'hbpsup2-4S22-701', 'hcan-3n83-601'],
  'the known damaged MCQ rows must not grow without a matching record');

console.log(`PASS 18 Hindi uploads audited: ${fx.pairs.length} schemes tested, 0 keys attachable, ` +
  `0 of ${bank.length} bank rows keyed; ${damaged.length} served rows carry a damaged word start`);
