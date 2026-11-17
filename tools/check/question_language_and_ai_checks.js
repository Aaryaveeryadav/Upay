'use strict';
/* Contract for the three defects reported from the app screenshots.
 *
 * 1. Hindi questions were being served under non-Hindi subjects — a Social
 *    Science card whose only text was Devanagari, under an English heading, with
 *    "Get an AI answer" underneath. Hindi is the only subject that may serve
 *    Devanagari-only items; every other subject must show English wording or
 *    show nothing.
 * 2. A truncated option fragment ("Communist Party of India (Marxist) C. United
 *    Progressive Alliance") was offered as a question with nothing to answer, so
 *    the AI check could only fail. Rows like that must be recognised and
 *    withheld, without touching genuine match-the-column questions.
 * 3. "Check my answer with AI" failed with one opaque sentence for every cause,
 *    and the failure was then rendered as though it were a verdict. The failure
 *    must name its cause, must not be treated as a marked answer, and the typed
 *    answer must survive a retry.
 *
 * The daily-set fixes (resolving each card back to its bank record, and keying
 * the per-card check state by slot) are asserted structurally below, because
 * the failure they fix was that a card had no question to show at all.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..', '..');
const policy = require(path.join(ROOT, 'assets/js/language-policy.js'));
const quality = require(path.join(ROOT, 'assets/js/question-quality.js'));

/* ------------------------------------------------------- 1. language gating */

const hindiRow = { subject: 'social', en: '', hi: 'सही विकल्प का चयन कीजिए - — (आ) विश्व के देशों में बहुराष्ट्रीय कंपनियों द्वारा निवेश का सबसे अधिक सामान्य मार्ग है' };
assert(policy.issue(hindiRow), 'a Devanagari-only Social Science row must be withheld from an English-medium subject');

/* The same Hindi is fine under the Hindi subject. */
assert.equal(policy.issue({ subject: 'hindi', hi: hindiRow.hi }), '',
  'Hindi subject content must never be withheld by the language guard');
/* An English row with a Hindi translation alongside it is still fine. */
assert.equal(policy.issue({ subject: 'social', en: 'What is federalism?', hi: 'संघवाद क्या है?' }), '',
  'a properly bilingual row must pass');
/* Latin text in a non-language subject always passes. */
assert.equal(policy.issue({ subject: 'science', en: 'State two differences between pollination and fertilization.' }), '',
  'an English Science question must pass');
/* An English paper that only carries the Hindi column is not an English question. */
assert(policy.issue({ subject: 'english', en: '', hi: 'लैंचो ने भगवान को पत्र क्यों लिखा?' }),
  'a Devanagari-only English-subject row must be withheld');

/* Against the real bank: the guard removes the Hindi leftovers and nothing else. */
const ctx = { window: {}, console, setTimeout: () => 0 };
ctx.window = ctx; ctx.document = {}; ctx.self = ctx; ctx.UP = { pyq: [] };
vm.createContext(ctx);
const run = rel => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });
['assets/js/data/pyq-social.js', 'assets/js/data/social10-q.js'].forEach(run);
const social = (ctx.UP.pyq || []).filter(q => q && q.subject === 'social');
const withheld = social.filter(q => policy.issue(Object.assign({}, q, { subject: q.subject })));
assert.equal(social.length, 1429, 'the Social Science bank must still load in full');
assert.equal(withheld.length, 79, 'exactly the 79 Devanagari-only Social rows are withheld');
assert(withheld.every(q => !String(q.en || '').trim()), 'every withheld row has no English text at all');
assert(withheld.every(q => /[\u0900-\u097f]/.test(String(q.hi || ''))), 'every withheld row does carry Hindi text');
assert.equal(withheld.filter(q => String(q.en || '').trim()).length, 0,
  'a row with English wording is never withheld by this guard');

/* -------------------------------------------------- 2. option fragments */

const fragment = 'Communist Party of India (Marxist) C. United Progressive Alliance';
assert(quality.isOptionFragment(fragment, { opts: null }), 'the glued option-list fragment must be recognised');
assert.equal(quality.inspect({ en: fragment, kind: 'short', subject: 'social' }, 'social'), 'option-fragment',
  'the fragment must be withheld by the quality gate');
assert(quality.isOptionFragment('Telugu Desam Party D. Left Front', { opts: null }), 'the second fragment must be recognised');

/* The bank splits one MCQ into one row per option, so a whole family of these
   reaches the app as "questions". Every such row must be recognised; the count
   is pinned so a regression that starts serving them again fails here. */
const R = path.join(ROOT, 'assets/js/data');
const bank = { window: {}, UP: { pyq: [] } };
bank.window = bank; bank.console = console;
vm.createContext(bank);
['pyq-social.js', 'social10-q.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(R, f), 'utf8'), bank, { filename: f }));
const splitOptions = (bank.UP.pyq || []).filter(q => q && q.subject === 'social')
  .filter(q => quality.inspect(q, 'social') === 'option-fragment');
/* Pinned at the bank-wide figure: 27 Social, 4 English, 2 Chemistry and 1 Maths.
   An earlier version of the rule matched any inline "(b)" and flagged 658 rows,
   including 460 genuine Maths questions — the count guard is what catches that. */
assert(splitOptions.length >= 25 && splitOptions.length <= 60,
  'only genuinely unanswerable rows are withheld, got ' + splitOptions.length);
assert(splitOptions.some(q => q.id === 'jessciv-04-10'), 'the reported Political Parties fragment must be among them');

/* A real question is never caught, even when it quotes option letters. */
for (const genuine of [
  'What are the different forms of power sharing in modern democracies? Give an example of each of these.',
  'Which of these conclusions do you agree with and why? A. Power sharing is necessary B. Power sharing is suitable',
  'Explain what is meant by proto-industrialisation.',
  'State any two differences between the local government before and after the Constitutional amendment in 1992.'
]) {
  assert.equal(quality.isOptionFragment(genuine, { opts: null }), false, 'a genuine question must not be withheld: ' + genuine.slice(0, 40));
}
/* A row that does carry an options array is an MCQ, not a stray fragment. */
assert.equal(quality.isOptionFragment(fragment, { opts: ['a', 'b', 'c', 'd'] }), false,
  'a record with real options is never an option fragment');

/* A "Match the following" row that kept one pair has nothing to match. */
assert(quality.isOptionFragment('Match the following. \u2014 (ii) Agmark (b) Dealing with consumer cases', { opts: null }),
  'a matching question with a single pair must be withheld');
assert.equal(quality.isOptionFragment('Match the following. \u2014 (i) Quotas (a) limit imports (ii) Taxes (b) levy (iii) MNCs (c) invest', { opts: null }), false,
  'a matching question with several pairs must pass');

/* The false positives that a wider rule produced — real papers number their
   parts like options, and maths notation uses capitals before brackets. */
for (const real of [
  'Assertion (A) : The probability of getting a prime number, when a die is thrown once, is',
  'In an A.P., if d = -4 and a = 4, then the first term \'a\' is equal to 1 7 (A) 6 (B) 7 (C) 20',
  'If B(adj B) = , then the value of det (B-1) = (A) (B) (C) (D)',
  'The value of 45 tan 45 sec 60 cos 90 sin is : (a) 1 (b)',
  'In India seats are reserved for women in \u2014 (a) Lok Sabha',
  '(cosec A sin A) (sec A cos A) = A cot A tan'
]) {
  assert.equal(quality.isOptionFragment(real, { opts: null }), false,
    'a genuine question must survive the fragment rule: ' + real.slice(0, 40));
}

/* ------------------------------------------------- 3. AI-check failure text */

const app = fs.readFileSync(path.join(ROOT, 'assets/js/app.js'), 'utf8');

/* The checker must keep the server's code, so the UI can name the cause. */
assert(/err\.code = \(j && j\.code\) \|\| '';/.test(app), 'aiCheckAnswerText must carry the server error code');
assert(/function aiCheckFailureMessage\(err\)/.test(app), 'a single failure-message helper must exist');
for (const [name, code] of [['sign-in', 'sign_in_required'], ['disabled', 'ai_disabled'],
  ['quota', 'ai_quota_exhausted'], ['setup', 'usage_setup_pending']]) {
  assert(new RegExp(`code === '${code}'`).test(app), `the ${name} cause must be named explicitly`);
}
/* And no call site may keep the old blanket sentence. */
assert.equal((app.match(/AI check could not run right now/g) || []).length, 1,
  'only the helper default may retain the generic sentence');
assert(/if \(st\.failed\) \{/.test(app), 'a failed check must render as a failure, not as a verdict');
assert(/if \(st\.failed\) \{[\s\S]{0,900}data-action="dailyCheck"/.test(app),
  'a failed check must offer a retry of that same card');
const failedBlock = (app.match(/if \(st\.failed\) \{[\s\S]*?\n      \}/) || [''])[0];
assert(!/similarButton/.test(failedBlock),
  'a failed check must not offer "a similar question" as though the answer was wrong');
/* The typed answer survives a retry. */
assert(/const previous = dailyCheckState\(q, i\);/.test(app), 'a retry must recover the typed answer from state');

/* --------------------------------------- 4. daily cards render a question */

/* Every daily item carries its source record, so the card can show the
   question, its options and its key rather than a bare sentence. */
assert(/raw:source\.raw/.test(app), 'a scheduled-review item must carry its source record');
assert.equal((app.match(/raw:x\.raw/g) || []).length, 2, 'a weak and a stretch item must carry their source record');
assert(/function loadDailyCards\(\)/.test(app), 'one loader must resolve scheduling items into cards');
assert(/DAILY = loadDailyCards\(\);/.test(app), 'viewToday must resolve each scheduling item back to a bank record');
assert(/\.filter\(Boolean\);/.test(app), 'unresolvable items must drop out rather than render blank');
assert(/S\.dailyAI = \{\};/.test(app), 'per-card state must reset when the set changes');
/* Per-card state is keyed by slot, so one card's verdict cannot appear on another. */
assert(/function dailyStateKey\(q, i\)/.test(app), 'per-card check state must be keyed by slot');
assert(/\|\' \+ String\(i\) \+ \'\|\\'/.test(app) || /'daily\|' \+ String\(i\)/.test(app),
  'the state key must include the slot index');
assert(!/return S\.dailyAI\[q\.id \|\| q\.no\] \|\| null;/.test(app),
  'the old id-only (colliding) key must be gone');

/* Reveal must produce an answer when the bank holds no key. */
assert(/data-action="dailyRevealAnswer"/.test(app), 'a keyless card must offer an AI answer on reveal');
assert(/if \(panel\.dataset\.dailyAi != null\) fetchDailyRevealAnswer/.test(app),
  'opening a keyless reveal must fetch that card\'s answer');
assert(/function fetchDailyRevealAnswer\(i\)/.test(app), 'the per-card AI answer fetcher must exist');

console.log(`PASS Hindi kept out of non-Hindi subjects (${withheld.length} withheld of ${social.length}), ` +
  'option fragments withheld, AI-check failures named and retryable, daily cards resolve to a question');
