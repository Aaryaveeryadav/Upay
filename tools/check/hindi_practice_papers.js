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
assert.equal(fx.files.length, 36, 'all 36 uploads must be recorded');
assert.equal(fx.bankRowsWithKey, 0, 'no Hindi bank row may carry a verified key');

/* The second batch of 18 is the Course A / Course B *board* sets: 3/x/y with
   Series KMLN2/N4KLM and 4/S/x with Series EFGH/S. Like the practice papers,
   not one has a text layer that transcribes the printed page, and none of them
   ships a marking scheme, so nothing in the batch can key a question. */
const board = fx.files.filter(f => /^(?:3-|4-S-)/.test(f.file));
assert.equal(board.length, 18, 'the 18 board sets must be recorded');
assert.equal(board.length + 18, fx.files.length, 'the fixture holds both batches');
assert(board.every(f => f.faithful === false), 'no board set transcribes faithfully');
assert(board.every(f => f.kind === 'unclassified'),
  'no board set is classifiable from its own text');
assert.equal(board.filter(f => f.kind === 'marking-scheme').length, 0,
  'the board batch carries no marking scheme, so no key is available in it');
/* 15 of the 18 Course A sets are already cited by 156 shipped bank rows. Those
   rows stay unkeyed: the paper they came from has no faithful text layer, and no
   marking scheme exists in this batch, so there is nothing to verify against.
   The three Course B sets are cited by nothing. */
const citedSets = board.filter(f => (f.bankRowsCiting || []).length > 0);
const citedRows = board.reduce((n, f) => n + (f.bankRowsCiting || []).length, 0);
assert.equal(citedSets.length, 15, 'fifteen Course A sets already carry bank rows');
assert.equal(citedRows, 156, 'the shipped rows citing them must not change');
assert(board.filter(f => /4-S-/.test(f.file)).every(f => (f.bankRowsCiting || []).length === 0),
  'the Course B sets are cited by no bank row');

/* Three are image-only scans with no text layer at all. */
const boardScans = board.filter(f => !f.hasTextLayer);
assert.deepEqual(boardScans.map(f => f.file).sort(), [
  '3-1-1_Hindi A (1).pdf', '3-1-2_Hindi A (1).pdf', '3-1-3_Hindi A (1).pdf',
], 'the Course A 3/1/x sets are image-only');
assert(boardScans.every(f => f.devanagariChars === 0), 'a scan yields no Devanagari');

/* The Course A sets keep their printed code and set number in Latin digits even
   though their Hindi is KrutiDev glyph soup. */
for (const [file, code, series, set] of [
  ['3-2-1_Hindi A (1).pdf', '3/2/1', 'KMLN2', 1],
  ['3-2-2_Hindi A (1).pdf', '3/2/2', 'KMLN2', 2],
  ['3-2-3_Hindi A (1).pdf', '3/2/3', 'KMLN2', 3],
  ['3-3-1_Hindi A (1).pdf', '3/3/1', 'KL3MN', 1],
  ['3-3-3_Hindi A (1).pdf', '3/3/3', 'KL3MN', 3],
  ['3-4-1_Hindi A.pdf', '3/4/1', 'N4KLM', 1],
  ['3-5-1_Hindi (A).pdf', '3/5/1', 'KN5ML', 1],
]) {
  const f = byName[file];
  assert(f, `${file} must be recorded`);
  assert.equal(f.code, code, `${file}: printed code`);
  assert.equal(f.series, series, `${file}: printed series`);
  assert.equal(f.set, set, `${file}: printed set`);
}

/* Only the Course B 4/S/x sets retain real Devanagari, and it is still
   unfaithful: hundreds of words begin with a dependent vowel sign, which no
   printed Hindi word can do. */
const courseB = board.filter(f => /4-S-/.test(f.file));
assert.equal(courseB.length, 3, 'three Course B sets');
for (const f of courseB) {
  assert(f.devanagariChars > 7000, `${f.file}: carries real Devanagari volume`);
  assert(f.impossibleInitialWords > 400, `${f.file}: and it is visibly shifted`);
}

/* Every file with a text layer must be unfaithful; every unfaithful one must
   say why in machine-checkable form. */
for (const f of fx.files) {
  if (!f.hasTextLayer) {
    assert.equal(f.devanagariChars, 0, `${f.file}: an image-only scan has no Devanagari text`);
    assert.equal(f.kind, 'unclassified', `${f.file}: a scan cannot be classified from its own text`);
    continue;
  }
  if (f.devanagariChars === 0) {
    /* No Devanagari character exists to read, so no word can begin with a
       Devanagari sign. Two different causes appear in these files:
         - legacy KrutiDev typesetting (the 4/6/x sets), where every Hindi glyph
           is a Latin code point, so a large Latin volume remains;
         - the Course A 3/2 … 3/5 sets, where the Hindi is set in an embedded
           font with no usable ToUnicode at all: only the Latin page furniture
           (question numbers, "P.T.O.", series) is recoverable.
       Both make the text unreadable for transcription; neither may be read as
       Hindi. The volume separates them. */
    assert((f.latinLetters || 0) > 380, `${f.file}: a text layer with no Devanagari must still yield Latin`);
    assert.equal(f.kind, 'unclassified', `${f.file}: Latin-glyph text yields no Hindi structure`);
    assert.deepEqual(f.signatures, {}, `${f.file}: no Devanagari signature can fire without Devanagari`);
    continue;
  }
  assert(f.devanagariChars > 2000, `${f.file}: text layer should carry real Devanagari volume`);
  assert.equal(f.faithful, false, `${f.file}: text layer must be recorded as unfaithful`);
  assert(f.impossibleInitialWords > 0, `${f.file}: unfaithfulness must be shown by impossible word starts`);
}

/* Nine uploads are image-only: the six 2026 Course B sets (4/7/x and 4/8/x),
   plus the Course A 3/1/x sets from the second batch. */
const scans = fx.files.filter(f => !f.hasTextLayer);
assert.equal(scans.length, 9, 'nine uploads are image-only scans');
const scanPages = scans.map(f => f.pdfPages).sort((a, b) => a - b);
assert.deepEqual(scanPages, [11, 11, 11, 16, 16, 16, 16, 16, 16],
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
assert.deepEqual(kinds, { 'question-paper': 5, 'marking-scheme': 4, unclassified: 27 },
  'five question papers, four marking schemes, and 27 unclassifiable');

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

/* Re-run the original broad signal independently against the raw imports and
   the generated sidecar. Reading passages are retained as reading material,
   not standalone questions. No damaged practice row may slip through. */
const quality = require('../../assets/js/question-quality');
const language = require('../../assets/js/language-policy');
const overrides = ctx.UP.questionOverrides;
const excluded = new Set([...overrides.drop, ...overrides.duplicates]);
const curated = bank.filter(q => !excluded.has(q.id));
const signal = /(?:^|[^\u0900-\u097f\u200d])[ािीुूृॄेैोौंःँ़्]/u;
const flagged = curated.filter(q => signal.test(`${q.hi || ''} ${q.en || ''}`));
assert.equal(curated.length, 898, 'the sidecar retains the other imported rows');
assert(flagged.length <= 13, 'the remaining passage flags may shrink, not grow');
assert(flagged.every(q => q.kind === 'text' && language.issue(q)), 'no flagged row offered for practice');
for (const id of ['hbp26v2-4b26v213-702', 'hbpsup2-4S22-701', 'hcan-3n83-601']) {
  const row = bank.find(q => q.id === id);
  assert(row && !row.keyVerified, 'original unkeyed source retained: ' + id);
  assert.equal(quality.inspect(row), 'ocr-damaged');
  assert.equal(overrides.dropReasons[id], 'ocr-damaged');
}
for (const text of ['“्मृति” का अर्थ लिखिए।', 'उत्तर (ंए) में से चुनिए।', 'अर्थ लिखिए: ्र्ठ ग्वालियर।'])
  assert.equal(quality.inspectText(text, 'hindi'), 'ocr-damaged');
for (const text of ['स्मृति शब्द का अर्थ लिखिए।', '“ि” और “◌ा” मात्राओं का प्रयोग समझाइए।', 'उत्तर लिखिए ः कौन आया?', 'क्‍ष और क्‌ष में अंतर बताइए।'])
  assert.equal(quality.inspectText(text, 'hindi'), '', 'keep intact words and isolated signs: ' + text);
assert(quality.optionIssue([{en:'water',hi:'्मृति'}, 'रंग', 'नदी', 'मार्ग'], 'hindi'), 'also check the displayed Hindi choice');

const boardCount = fx.files.filter(f => /^(?:3-|4-S-)/.test(f.file)).length;
console.log(`PASS ${fx.files.length} Hindi uploads audited (${fx.files.length - boardCount} practice papers, ` +
  `${boardCount} board sets): ${fx.pairs.length} schemes tested, 0 keys attachable, ` +
  `0 of ${bank.length} bank rows keyed; 0 word-start flags admitted to standalone practice`);
