'use strict';
/* Reading the app's own chapter data on the server.
 *
 * The browser packs (assets/js/data/*.js, assets/science/science10.js) are
 * plain scripts that register themselves on a global `UP`. They are evaluated
 * once in an isolated VM context, then split into paragraph-sized windows and
 * scored with the same lexical rules as the Science index. Nothing is fetched
 * from the network and no PDF is read: only the reviewed data the app already
 * serves.
 *
 * Science (Class 10, and Class 12 Physics/Chemistry) uses
 * assets/science/science-index.json instead (lib/science-rag.js); this module
 * covers the other subjects.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const CACHE = new Map();

/* Each subject declares the browser scripts that carry its reviewed data and
   the global each one fills. Only files that exist are evaluated. */
const PACKS = {
  10: {
    social: ['assets/js/data/social-chapters.js', 'assets/js/data/social10-q.js', 'assets/js/data/pyq-social.js'],
    hindi: ['assets/science/hindi10-ch.js', 'assets/js/data/hindi10-q.js', 'assets/js/data/hindi10-rich.js', 'assets/js/data/pyq-hindi-final.js'],
    english: ['assets/js/data/english10.js', 'assets/js/data/english10-ff.js', 'assets/js/data/english10-fp.js', 'assets/js/data/pyq-english.js']
  },
  12: {
    maths: ['assets/js/data/chapters12-maths.js', 'assets/js/data/pyq-cbse2025-cls12.js'],
    english: ['assets/js/data/english12.js'],
    hindi: ['assets/js/data/hindi12.js', 'assets/js/data/hindi12-core-text.js']
  }
};

function packKey(cls, subject) { return cls + ':' + subject; }

function loadPack(cls, subject) {
  const key = packKey(cls, subject);
  if (CACHE.has(key)) return CACHE.get(key);
  const files = (PACKS[cls] || {})[subject];
  if (!files) { CACHE.set(key, null); return null; }
  const sandbox = { console: { warn() {}, log() {}, error() {} } };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  // Packs assume the core boot has already created UP.pyq/UP.pyq arrays.
  sandbox.UP = { pyq: [], science10: [], subjects: {}, chapters: [] };
  let loaded = 0;
  for (const rel of files) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    try {
      vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: rel, timeout: 5000 });
      loaded++;
    } catch (_) { /* a pack that cannot be evaluated is simply not available */ }
  }
  if (!loaded) { CACHE.set(key, null); return null; }
  CACHE.set(key, { up: sandbox.UP, loaded });
  return CACHE.get(key);
}

function clean(text) { return String(text || '').replace(/\s+/g, ' ').trim(); }
const pick = (value, lang) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return String(value[lang || 'en'] || value.en || value.hi || '');
};

/* Split prose into ~800-character windows on sentence boundaries. */
function windows(text, size) {
  const body = clean(text);
  if (!body) return [];
  const sentences = body.split(/(?<=[.!?।])\s+/);
  const out = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > (size || 800)) { out.push(current); current = sentence; }
    else current += (current ? ' ' : '') + sentence;
  }
  if (current) out.push(current);
  return out;
}

/* One adapter per data shape, so a new subject only adds a function here. */
const ADAPTERS = {
  /* assets/js/data/social-chapters.js + social10-q.js */
  social(up, rows, add) {
    const chapters = Array.isArray(up.socialChapters) ? up.socialChapters : [];
    for (const chapter of chapters) {
      const no = chapter.ch != null ? Number(chapter.ch) : null;
      const title = pick(chapter, 'en');
      for (const concept of chapter.concepts || []) {
        for (const chunk of windows(pick(concept, 'en'), 700)) {
          add({ chapter: no, chapterTitle: title, section: 'Concept', docType: 'chapter',
            label: 'NCERT \u00b7 Ch ' + (no || '?') + ' \u00b7 ' + title, text: chunk });
        }
      }
      for (const key of ['terms', 'keywords']) {
        const list = Array.isArray(chapter[key]) ? chapter[key] : [];
        for (const t of list) {
          const text = typeof t === 'string' ? t : pick(t, 'en');
          if (text) add({ chapter: no, chapterTitle: title, section: key, docType: 'chapter',
            label: 'NCERT \u00b7 Ch ' + (no || '?') + ' \u00b7 ' + title, text });
        }
      }
    }
    for (const q of (Array.isArray(up.social10Q) ? up.social10Q : [])) {
      const text = pick(q, 'en') || q.q || '';
      if (!text) continue;
      const answer = q.a || q.answer || '';
      add({ chapter: q.ch != null ? Number(q.ch) : null, section: 'Exercise', docType: 'exercise',
        label: 'NCERT exercise \u00b7 Ch ' + (q.ch || '?'), text: text + (answer ? '\nNCERT answer: ' + answer : ''), question: text });
    }
  },
  /* assets/science/hindi10-ch.js + hindi10-q.js */
  hindi(up, rows, add) {
    const chapters = Array.isArray(up.hindi10Chapters) ? up.hindi10Chapters : [];
    // The full text of 32 of the 42 chapters lives in hindi10-rich.js, keyed by
    // position; the outline (hindi10-ch.js) carries book, number and title.
    const rich = up.hindi10Rich || {};
    const richById = up.hindi10RichById || {};
    const richList = Object.values(rich);
    for (const chapter of chapters) {
      // Chapter numbers repeat across the four books, so the label carries the
      // book (क्षितिज / स्पर्श / संचयन / कृतिका) to stay unambiguous.
      const no = chapter.no != null ? Number(chapter.no) : null;
      const title = chapter.hi || chapter.en || ('\u092a\u093e\u0920 ' + no);
      const book = chapter.bookHi || chapter.bookEn || '';
      const label = 'NCERT ' + book + ' \u00b7 \u092a\u093e\u0920 ' + (no || '?') + ' \u00b7 ' + title;
      const extra = richById[chapter.id] || richList.find(r => r && r.id === chapter.id) || null;
      const fallback = !extra ? richList[Number(chapter.n != null ? chapter.n - 1 : no - 1)] || null : null;
      const textSource = extra || fallback;
      if (textSource) {
        for (const section of textSource.sections || []) {
          for (const chunk of windows(section.text, 800)) {
            add({ chapter: no, chapterTitle: title, section: String(section.title || '\u092e\u0942\u0932 \u092a\u093e\u0920'),
              docType: 'chapter', label, text: chunk });
          }
        }
        for (const chunk of windows(textSource.summaryHi, 800)) {
          add({ chapter: no, chapterTitle: title, section: '\u0938\u093e\u0930\u093e\u0902\u0936', docType: 'summary', label, text: chunk });
        }
        for (const chunk of windows(textSource.beforeYouReadHi, 800)) {
          add({ chapter: no, chapterTitle: title, section: '\u092a\u093e\u0920 \u0938\u0947 \u092a\u0939\u0932\u0947', docType: 'summary', label, text: chunk });
        }
        for (const group of textSource.exerciseGroups || []) {
          for (const q of group.questions || []) {
            const question = typeof q === 'string' ? q : pick(q, 'hi') || pick(q, 'en');
            if (!question) continue;
            add({ chapter: no, chapterTitle: title, section: '\u0905\u092d\u094d\u092f\u093e\u0938', docType: 'exercise',
              label, text: question, question });
          }
        }
      }
      for (const chunk of windows(chapter.hiDesc || chapter.enDesc, 800)) {
        add({ chapter: no, chapterTitle: title, section: '\u092a\u0930\u093f\u091a\u092f', docType: 'summary', label, text: chunk });
      }
    }
  },
  /* Class 12 maths / physics / chemistry chapter maps (concepts + formulas) */
  chapterMap(up, rows, add) {
    const lists = ['course12maths', 'physics12', 'chemistry12', 'biology12'];
    for (const name of lists) {
      const chapters = Array.isArray(up[name]) ? up[name] : [];
      for (const chapter of chapters) {
        const no = chapter.id != null ? Number(chapter.id) : null;
        const title = chapter.en || chapter.title || '';
        const desc = chapter.enDesc || '';
        for (const chunk of windows(desc, 800)) {
          add({ chapter: no, chapterTitle: title, section: 'Overview', docType: 'chapter',
            label: 'NCERT \u00b7 Ch ' + (no || '?') + ' \u00b7 ' + title, text: chunk });
        }
        for (const concept of chapter.concepts || []) {
          const head = pick(concept.t, 'en');
          const body = pick(concept.b, 'en');
          if (head || body) add({ chapter: no, chapterTitle: title, section: head, docType: 'chapter',
            label: 'NCERT \u00b7 Ch ' + (no || '?') + ' \u00b7 ' + title, text: head + ': ' + body });
        }
        for (const formula of chapter.formulas || []) {
          const text = typeof formula === 'string' ? formula : (pick(formula, 'en') || formula.t || formula.f || '');
          if (text) add({ chapter: no, chapterTitle: title, section: 'Formula', docType: 'formula',
            label: 'Formula \u00b7 Ch ' + (no || '?') + ' \u00b7 ' + title, text: String(text) });
        }
        for (const key of ['keywords']) {
          const list = chapter[key] && Array.isArray(chapter[key].en) ? chapter[key].en : [];
          const text = list.join(', ');
          if (text) add({ chapter: no, chapterTitle: title, section: 'Keywords', docType: 'chapter',
            label: 'Keywords \u00b7 Ch ' + (no || '?') + ' \u00b7 ' + title, text });
        }
      }
    }
    /* Class 12 English / Hindi literature */
    for (const subject of ['english', 'hindi']) {
      const lists = subject === 'english'
        ? (Array.isArray(up.course12english) ? [[up.course12english, 'english']] : [])
        : (Array.isArray(up.hindi12) ? [[up.hindi12, 'hindi']] : []);
      for (const [list, name] of lists) {
        for (const chapter of list) {
          const no = chapter.id != null ? Number(chapter.id) : null;
          const title = chapter.en || chapter.hi || '';
          const desc = chapter.enDesc || chapter.hiDesc || '';
          const label = (chapter.bookTitle ? pick(chapter.bookTitle, 'en') + ' \u00b7 ' : '') + title;
          for (const chunk of windows(desc, 800)) {
            add({ subject: name, chapter: no, chapterTitle: title, section: 'Chapter', docType: 'chapter', label, text: chunk });
          }
          for (const part of [chapter.focus, chapter.review, chapter.question]) {
            const text = typeof part === 'string' ? part : (Array.isArray(part) ? part.map(x => pick(x, 'en') || x).join(' ') : '');
            for (const chunk of windows(text, 800)) {
              add({ subject: name, chapter: no, chapterTitle: title, section: 'Notes', docType: 'chapter', label, text: chunk });
            }
          }
        }
      }
    }
  },
  /* Class 10 English / Hindi literature readers (english10-ff/fp, hindi10-rich) */
  english(up, rows, add) {
    const lists = [];
    if (Array.isArray(up.english10FF)) lists.push([up.english10FF, 'First Flight']);
    if (Array.isArray(up.english10FP)) lists.push([up.english10FP, 'Footprints without Feet']);
    for (const [list, book] of lists) {
      for (const chapter of list) {
        if (!chapter || chapter.scanned) continue;
        // Chapter ids repeat positionally inside each book; the section label
        // carries the book title so "Ch 3" is never ambiguous in a citation.
        const no = chapter.n != null ? Number(chapter.n) : (parseInt(String(chapter.id).replace(/\D+/g, ''), 10) % 100 || null);
        const title = chapter.en || chapter.hi || '';
        const label = 'NCERT ' + book + ' \u00b7 ' + title;
        for (const chunk of windows(chapter.beforeYouRead, 800)) {
          add({ chapter: no, chapterTitle: title, section: 'Before you read', docType: 'summary', label, text: chunk });
        }
        for (const section of chapter.sections || []) {
          for (const chunk of windows(section.text, 800)) {
            add({ chapter: no, chapterTitle: title, section: String(section.n || '') + ' ' + (section.title || ''),
              docType: 'chapter', label, text: chunk });
          }
        }
        for (const group of chapter.exercises || []) {
          const questions = Array.isArray(group.questions) ? group.questions : (Array.isArray(group) ? group : []);
          for (const q of questions) {
            const text = typeof q === 'string' ? q : (q.q || q.en || '');
            if (text) add({ chapter: no, chapterTitle: title, section: 'Exercise', docType: 'exercise', label, text, question: text });
          }
        }
      }
    }
  },
  /* Board questions (shared by every subject) */
  pyq(up, rows, add, cls, subject) {
    for (const row of (Array.isArray(up.pyq) ? up.pyq : [])) {
      if (!row || row.cls !== cls || row.subject !== subject) continue;
      const text = row.en || row.q || row.text || '';
      if (!text) continue;
      const ch = row.ch != null ? Number(row.ch) : null;
      add({ chapter: ch, chapterTitle: '', section: row.kind || 'PYQ',
        label: (row.y ? 'CBSE ' + row.y + ' \u00b7 ' : 'CBSE board question \u00b7 ') + 'Ch ' + (ch || '?'),
        docType: 'pyq', text, question: text, year: row.y || null });
    }
  }
};

function chapterRows(cls, subject) {
  const pack = loadPack(cls, subject);
  if (!pack) return [];
  const up = pack.up || {};
  const rows = [];
  const add = row => rows.push(Object.assign({ id: 'row-' + rows.length, subject }, row));
  const adapter = {
    social: ADAPTERS.social, hindi: ADAPTERS.hindi,
    maths: ADAPTERS.chapterMap, physics: ADAPTERS.chapterMap, chemistry: ADAPTERS.chapterMap, biology: ADAPTERS.chapterMap,
    english: cls === 10 ? ADAPTERS.english : ADAPTERS.chapterMap
  }[subject];
  if (adapter) {
    try { adapter(up, rows, add); } catch (_) { /* keep whatever was added */ }
  }
  try { ADAPTERS.pyq(up, rows, add, cls, subject); } catch (_) {}
  return rows.filter(r => r.text && typeof r.text === 'string' && r.text.length > 1);
}

const STOP = new Set(('a about all an and are as at be by can class define describe did do does explain for from give has have how in into is it its me name of on or should state tell that the their them these they this to using was were what when where which who why will with would write you your').split(' '));

function tokens(text) {
  return String(text || '').toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]+/g, ' ')
    .split(' ')
    .filter(t => t.length > 2 && !STOP.has(t));
}

/* Question words that name the shape of an answer, not its subject. They are
   dropped from scoring so "theme of the poem" does not match every poem. */
const META = new Set(('theme summary explain explanation answer question questions important point points note notes short long write give tell discuss analysis analyse analyze meaning message central idea main poem poetry poet prose chapter book ncert cbse class').split(' '));

/* A question often names its chapter in passing ("... in the poem Dust of
   Snow", "माता का आँचल का सारांश"). If a chapter title appears inside the
   question, those rows win: that signal is never ambiguous.
   Chapters whose title is absent are matched from the CBSE text of their own
   questions ("Dust of Snow" appears only inside a board paper), so a poem with
   no chapter row can still be named. */
function norm(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function titleCandidates(cls, subject, question, rows) {
  const lower = ' ' + norm(question) + ' ';
  const out = [];
  const questionNorm = norm(question);
  for (const row of rows) {
    const title = norm(row.chapterTitle);
    if (title.length >= 6 && lower.includes(' ' + title + ' ')) out.push(title);
  }
  // Named-but-absent chapters: a Title Case phrase from the question that also
  // occurs in a board-question row ("Dust of Snow" appears only inside papers
  // because the poem's text is not in this repo). Ordinary lowercase wording is
  // never treated as a title, so "dams in india" cannot anchor a question.
  if (!out.length) {
    const original = String(question || '');
    const words = original.split(/\s+/).filter(Boolean);
    const phrases = [];
    for (let size = Math.min(5, words.length); size >= 2; size--) {
      for (let start = 0; start + size <= words.length; start++) {
        const slice = words.slice(start, start + size);
        const cleaned = slice.map(w => w.replace(/^[^A-Za-z\u0900-\u097F]+|[^A-Za-z\u0900-\u097F]+$/g, ''));
        const capitalised = cleaned.filter(w => /^[A-Z]/.test(w)).length;
        const content = cleaned.filter(w => w.length > 2 && !META.has(w.toLowerCase())).length;
        if (capitalised >= 1 && content >= 2) phrases.push(norm(cleaned.join(' ')));
      }
    }
    for (const phrase of phrases) {
      if (phrase.length < 8) continue;
      const found = rows.some(row => norm(row.question || '').includes(' ' + phrase + ' ') || norm(row.text).includes(' ' + phrase + ' '));
      if (found) out.push(phrase);
    }
  }
  return out;
}

function search(scope, question, limit) {
  const cls = Number(scope && scope.class) || 10;
  const subject = String(scope && scope.subject || '').toLowerCase();
  const chapter = scope && scope.chapter != null && scope.chapter !== '' ? Number(scope.chapter) : null;
  const rows = chapterRows(cls, subject);
  if (!rows.length) return [];
  const q = tokens(question).filter(t => !META.has(t));
  if (!q.length) return [];
  const qSet = new Set(q);
  const titleHits = titleCandidates(cls, subject, question, rows);
  // A short question that is only a title ("Dust of Snow") is a lookup, not a
  // search: answer from the passages that carry that name.
  const bare = norm(question).split(' ').filter(w => !META.has(w) && w.length > 2);
  const namedPhrase = titleHits.find(t => t.split(' ').length >= 2 && t.split(' ').length >= bare.length - 1);
  // Document frequency, so a word every chapter uses ("formation", "answer")
  // weighs less than a distinctive one ("micelle", "sakhi").
  const docFreq = new Map();
  for (const row of rows) {
    const body = String(row.text || '').toLowerCase();
    let hit = false;
    for (const term of qSet) if (body.includes(term)) { docFreq.set(term, (docFreq.get(term) || 0) + 1); hit = true; }
    if (hit) row._seen = true;
  }
  const total = rows.length;
  const scored = [];
  for (const row of rows) {
    if (chapter != null && row.chapter !== chapter) continue;
    const body = String(row.text || '').toLowerCase();
    let score = 0, hits = 0;
    for (const term of qSet) {
      if (!body.includes(term)) continue;
      hits++;
      score += Math.log(1 + total / (docFreq.get(term) || 1));
    }
    if (!hits) continue;
    const rowTitle = norm(row.chapterTitle);
    const rowText = norm(row.text).slice(0, 2000);
    const named = titleHits.some(t => (rowTitle && (rowTitle.includes(t) || t.includes(rowTitle))) ||
      (t.length >= 8 && rowText.includes(t)));
    if (named) score += 6;
    if (row.docType === 'chapter' && named) score += 3; // prefer the passage over a past question
    if (row.docType === 'exercise' || row.docType === 'pyq') score -= 0.5; // context beats a bare question row
    scored.push({ score, row });
  }
  if (!scored.length) return [];
  scored.sort((a, b) => b.score - a.score);
  if (scored[0].score < 2.5) return [];
  // When a named text was recognised, only rows that actually carry it can be
  // cited for it. If none do, the honest answer is "the text is not in this
  // app yet" rather than four unrelated paragraphs.
  if (namedPhrase) {
    const anchored = scored.filter(item =>
      norm(item.row.chapterTitle).includes(namedPhrase) || norm(item.row.text).slice(0, 3000).includes(namedPhrase));
    return select(anchored, limit);
  }
  return select(scored, limit);
}

/* Greedy: take the best row, then prefer rows from other sections/chapters so
   the model sees breadth rather than four copies of the same paragraph. */
function select(scored, limit) {
  const want = limit || 4;
  const out = [];
  const usedSections = new Set();
  const usedChapters = new Set();
  for (const item of scored) {
    if (out.length >= want) break;
    const sectionKey = item.row.chapter + ':' + item.row.section + ':' + item.row.docType;
    const chapterKey = String(item.row.chapter);
    if (usedSections.has(sectionKey)) continue;
    if (out.length && usedChapters.has(chapterKey) && out.length < want - 1 && scored.length > want) continue;
    usedSections.add(sectionKey);
    usedChapters.add(chapterKey);
    out.push(item.row);
  }
  for (const item of scored) {
    if (out.length >= want) break;
    if (!out.includes(item.row)) out.push(item.row);
  }
  return out;
}

function availability() {
  const out = {};
  for (const [cls, subjects] of Object.entries(PACKS)) {
    for (const subject of Object.keys(subjects)) {
      const rows = chapterRows(Number(cls), subject);
      out[cls + ':' + subject] = { class: Number(cls), subject, chunks: rows.length, ready: rows.length > 0 };
    }
  }
  return out;
}

module.exports = { search, availability, chapterRows, windows, loadPack, PACKS };
