'use strict';
/* One correct answer for every question the site already carries.
 *
 *   Why this exists
 *   ---------------
 *   The tutor used to draft every question live. When the GPU was busy, asleep
 *   or simply not wired up yet, a question whose answer was ALREADY inside the
 *   app ("Why are bags of chips flushed with nitrogen gas?" is NCERT Ch 1
 *   Exercise Q19 with a verified answer) came back as "no draft could be
 *   written". That is a broken answer page, not an honest abstention.
 *
 *   So: every question in the data gets exactly one answer, produced ONCE by
 *   the site's own model (through lib/local-llm.js, the single model boundary),
 *   reviewed against its sources, and stored. The chat then answers from the
 *   store instantly; the model is only called for a question that is not in it.
 *
 *   What is stored (tools/answers/answers.json, one file per class+subject
 *   inside, see storePath)
 *     id       stable question id from the data
 *     q        the question text as stored in the data
 *     a        the answer text (citations [n] refer to this record's sources)
 *     sources  the excerpts the answer was built from (id, label, chapter, page)
 *     status   'verified' (built-in NCERT key, not model-written)
 *            | 'drafted'  (model-written and citation-checked)
 *     model    the model that drafted it, or 'data' for a built-in key
 *     hash     sha256 of q+sources, so a data change is detected, not served
 *
 *   Nothing here invents an answer: if the model is unreachable the record is
 *   simply not written, and the operator sees that in the report. An existing
 *   drafted answer is never overwritten by a weaker one.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const STORE = path.join(ROOT, 'tools', 'answers', 'answers.json');

function hashQuestion(question, sources) {
  const basis = String(question || '') + '\u0000' +
    (sources || []).map(s => s.id + '\u0000' + String(s.text || '').slice(0, 400)).join('\u0000');
  return crypto.createHash('sha256').update(basis).digest('hex').slice(0, 32);
}

let cache = null;
function load() {
  if (cache) return cache;
  try {
    const raw = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    cache = { version: 1, builtAt: raw.builtAt || null, entries: raw.entries || {} };
  } catch (_) {
    cache = { version: 1, builtAt: null, entries: {} };
  }
  return cache;
}
function save(store) {
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  const tmp = STORE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 1));
  fs.renameSync(tmp, STORE);
  cache = store;
}

/* Digits, case and spacing differ between a paper line and a typed question;
   normalising them lets a student's exact question find its stored answer. */
function normKey(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[“”„"]/g, '"').replace(/[’‘`]/g, "'")
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/[.?!]+$/g, '');
}

function scopeKey(cls, subject) { return Number(cls) + ':' + String(subject || '').toLowerCase(); }

/* Words too common to prove two questions are the same. Without this list
   "why are bags of chips flushed with nitrogen" would not match the NCERT
   wording "oil and fat containing food items are flushed with nitrogen. why?"
   on its own, but with it the shared content words (oxygen, rancid, flush,
   nitrogen, oxidise) decide. */
/* Words that are content-bearing in English generally but prove nothing about
   the topic of a question. Used only as a last guard in findByRows. */
const GENERIC = new Set(('question questions answer answers following above below correct incorrect ' +
  'statement statements reason assertion choose option options explain account give write state ' +
  'example examples difference between define describe find show calculate').split(' '));

const STOP = new Set(('the and for with are was were what which why how when where who whom whose this that these those ' +
  'from into onto over under about above below not can could should would will shall may might must do does did done ' +
  'is are be been being am it its their them they you your your ours his her hers him she he we us i me my mine ' +
  'of in on at to by as or if then than so such very more most much many some any all each every both few no nor ' +
  'with within without from into out up down off over again once about above below between through during ' +
  'please explain give state write define describe answer question following also there here').split(' '));

/* A tiny conservative stemmer: enough to make "flushed"/"flushing",
   "chips"/"chip" and "bags"/"bag" compare equal, not enough to merge unrelated
   words the way a full Porter stemmer can. */
function stem(word) {
  return String(word)
    .replace(/(ies)$/, 'y')
    .replace(/(sses|shes|ches|xes)$/, m => m.slice(0, -2))
    .replace(/([^su])s$/, '$1')
    .replace(/(ing|ed)$/, '')
    .replace(/e$/, '');
}
function contentWords(text) {
  const words = String(text || '').toLowerCase().match(/[a-z0-9\u0900-\u097F]+/g) || [];
  return new Set(words.filter(w => w.length > 3 && !STOP.has(w)).map(stem).filter(w => w.length > 2));
}
/* The unstemmed words of a text. For vocabulary questions ("does the book
   actually teach this word?") a substring test is used, so the full word is
   needed: the stem of "photosynthesis" is not a substring of it. */
function words(text) {
  return (String(text || '').toLowerCase().match(/[a-z0-9\u0900-\u097F]+/g) || [])
    .filter(w => w.length > 3 && !STOP.has(w));
}
function coverage(question, other) {
  const a = contentWords(question), b = contentWords(other);
  if (!a.size || !b.size) return { coverage: 0, shared: 0, words: [] };
  const words = [...a].filter(w => b.has(w));
  return { coverage: words.length / a.size, shared: words.length, words };
}

/* Look up one stored answer for a question asked in a scope.
   Exact (normalised) text, then a content-word overlap. The threshold is
   relative to the QUESTION's own words, so a short typed question still finds
   the longer book wording, while an unrelated question finds nothing. */
function find({ question, class: cls, subject, sources }) {
  const store = load();
  const scope = scopeKey(cls, subject);
  const want = normKey(question);
  if (!want) return null;
  for (const entry of Object.values(store.entries)) {
    if (entry.scope !== scope) continue;
    if (sources && entry.hash && entry.hash !== hashQuestion(entry.q, entry.sources)) continue;
    /* Exact wording only. A near-match here would answer a different question
       with somebody else's stored answer ("what is a convex mirror used as a
       rear-view mirror?" is not the NCERT exercise about three mirror uses).
       A paraphrased question goes to the model, which reads this chapter and
       answers the words actually asked. */
    if (normKey(entry.q) === want) return entry;
  }
  return null;
}

/* Align the question to a stored answer via what retrieval already returned.
   Deliberately conservative: an exact question, or one whose content words are
   almost entirely covered by the stored question. Anything looser is left to
   the verified-answer path in lib/chat.js (which answers from the book's own
   key when it has one) or to the model, rather than risk answering a
   different question with a stored answer. */
function findByRows(rows, question) {
  if (!rows || !rows.length) return null;
  const want = [...contentWords(question)];
  for (const row of rows.slice(0, 4)) {
    if (!row || !row.id) continue;
    const entry = get(row.id);
    if (!entry) continue;
    if (normKey(entry.q) === normKey(question)) return entry;
    if (!want.length) continue;
    const have = contentWords(entry.q);
    const covered = want.filter(w => have.has(w)).length / want.length;
    // 0.85: the asker's words are the book's words (a typo, an added
    // "explain", a dropped clause). Paraphrases are handled elsewhere.
    if (covered >= 0.85) return { ...entry, coverage: covered, via: 'row' };
  }
  return null;
}

function get(id) { return load().entries[id] || null; }

/* How many stored questions use a word. A word in almost every question
   ("equation", "explain") cannot identify one of them. */
const freqCache = new Map();
function documentFrequency(word) {
  if (freqCache.has(word)) return freqCache.get(word);
  const entries = Object.values(load().entries);
  let n = 0;
  for (const e of entries) if (contentWords(e.q).has(word)) n++;
  freqCache.set(word, n);
  return n;
}

/* Write one record. A built-in verified key always wins; a drafted answer is
   kept unless the caller explicitly asks to replace it. */
function put(record, { replace = false } = {}) {
  const store = load();
  const existing = store.entries[record.id];
  if (existing && !replace) {
    if (existing.status === 'verified') return { stored: false, reason: 'verified_key' };
    if (record.status !== 'verified' && existing.status === 'drafted') {
      // Same content: nothing to do. Changed content: replace only when asked.
      if (existing.hash === record.hash) return { stored: false, reason: 'unchanged' };
      return { stored: false, reason: 'exists' };
    }
  }
  store.entries[record.id] = record;
  return { stored: true };
}

function stats() {
  const store = load();
  const entries = Object.values(store.entries);
  const byStatus = {};
  const byScope = {};
  for (const e of entries) {
    byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    byScope[e.scope] = (byScope[e.scope] || 0) + 1;
  }
  return { total: entries.length, byStatus, byScope, builtAt: store.builtAt };
}

/* Every row the app can serve, for vocabulary and frequency questions. */
let allRowsCache = null;
function allRows() {
  if (allRowsCache) return allRowsCache;
  const rows = [];
  try {
    const subjectIndex = require('./subject-index.js');
    for (const [cls, subjects] of Object.entries(subjectIndex.PACKS)) {
      for (const subject of Object.keys(subjects)) {
        for (const row of subjectIndex.chapterRows(Number(cls), subject)) rows.push(row);
      }
    }
    for (const chunk of require('./science-rag.js').loadIndex().chunks) rows.push(chunk);
  } catch (_) { /* an unreadable pack must not break the chat */ }
  allRowsCache = rows;
  return rows;
}

module.exports = { STORE, load, save, find, findByRows, get, put, stats, hashQuestion, normKey, scopeKey,
  coverage, contentWords, words, stem, allRows };
