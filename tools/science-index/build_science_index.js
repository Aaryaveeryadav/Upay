#!/usr/bin/env node
/* =====================================================================
   Build assets/science/science-index.json for the Class 10 Science tutor.

   The local experiment (experiments/science-ai/tutor.py) indexes raw PDFs
   with PyMuPDF/OCR. That index is git-ignored and needs the private PDFs,
   so the web app cannot ship it. This tool builds the SAME kind of index
   from the reviewed data the app already serves:

     assets/science/science10.js        NCERT sections, activities, summaries
     assets/js/data/science10-q.js      NCERT exercises + verified answers
     assets/js/data/pyq-science.js      CBSE 2026 board questions
     assets/science/_extract.json       page map for the textbook PDF
     assets/science/_pyq-ocr.json       page map for the board papers

   Rules that keep the index honest:
     - A page number is attached only when a normalised text window from the
       chunk is actually found on that page. No page is guessed.
     - An answer is attached only when the record is key-verified. Board
       questions without a verified key are indexed as questions only.
     - Output is deterministic (no timestamps) so `--check` can prove the
       committed index matches the data files.

   Usage:
     node tools/science-index/build_science_index.js
     node tools/science-index/build_science_index.js --check
   ===================================================================== */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'assets', 'science', 'science-index.json');
const TARGET_CHARS = 800;
const OVERLAP_CHARS = 140;
const MAX_PYQ_CHARS = 1200;

const SOURCE_FILES = [
  'assets/science/science10.js',
  'assets/js/data/science10-q.js',
  'assets/js/data/pyq-science.js',
  'assets/science/_extract.json',
  'assets/science/_pyq-ocr.json'
];

function file(rel) { return path.join(ROOT, rel); }
function sha256(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function read(rel) { return fs.readFileSync(file(rel), 'utf8'); }

/* ---------- load the browser data files in a sandbox ---------- */
function loadData() {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  // pyq-science.js appends to UP.pyq; start from an empty bank, like boot.js.
  sandbox.UP = { pyq: [] };
  for (const rel of ['assets/js/data/pyq-science.js', 'assets/science/science10.js', 'assets/js/data/science10-q.js']) {
    vm.runInContext(read(rel), sandbox, { filename: rel });
  }
  const chapters = Array.isArray(sandbox.UP.science10) ? sandbox.UP.science10 : [];
  const exercise = Array.isArray(sandbox.UP.science10Q) ? sandbox.UP.science10Q : [];
  const pyq = Array.isArray(sandbox.UP.pyq) ? sandbox.UP.pyq : [];
  if (!chapters.length) throw new Error('science10.js did not expose UP.science10');
  if (!exercise.length) throw new Error('science10-q.js did not expose UP.science10Q');
  if (!pyq.length) throw new Error('pyq-science.js did not expose UP.pyq');
  return { chapters, exercise, pyq };
}

/* ---------- text helpers ---------- */
function clean(text) {
  return String(text == null ? '' : text)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* Lowercase alphanumeric-only stream. Used for page grounding, where the
   source JSON and the PDF extract differ only in spacing and artefacts. */
function alnum(text) { return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }

function pageFinder(pages) {
  const streams = pages.map(p => alnum(p.text));
  return function findPage(text) {
    const clean0 = alnum(text);
    if (clean0.length < 24) return null;
    const windows = [];
    for (const fraction of [0, 0.3, 0.6]) {
      const start = Math.floor(clean0.length * fraction);
      windows.push(clean0.slice(start, start + 64));
    }
    for (const w of windows) {
      if (w.length < 24) continue;
      for (let i = 0; i < streams.length; i++) {
        if (streams[i].includes(w)) return pages[i].page;
      }
    }
    return null;
  };
}

function sentences(text) {
  return clean(text)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(“"'])/)
    .map(s => s.trim())
    .filter(Boolean);
}

/* Split one long prose block into overlapping windows that end on a sentence. */
function windowed(text, target = TARGET_CHARS, overlap = OVERLAP_CHARS) {
  const parts = sentences(text);
  if (!parts.length) return [];
  const out = [];
  let buf = [];
  const join = list => list.join(' ');
  for (const part of parts) {
    if (buf.length && join(buf).length + part.length + 1 > target) {
      out.push(join(buf));
      // Carry the tail sentences as overlap so a definition cut at the edge is
      // still readable in the next window.
      const tail = [];
      for (let i = buf.length - 1; i >= 0; i--) {
        if (join([buf[i]].concat(tail)).length > overlap) break;
        tail.unshift(buf[i]);
      }
      buf = tail;
    }
    buf.push(part);
  }
  if (buf.length) out.push(join(buf));
  return out.map(s => s.trim()).filter(s => s.length >= 40);
}

/* One prose block becomes one chunk, or several overlapping windows when it is
   longer than a prompt-friendly size. A 14 KB activity is unreadable as one
   citation and crowds the tutor prompt, so it is split at sentence boundaries. */
function pushProse(target, base, body) {
  for (const text of windowed(body)) {
    const suffix = target.filter(c => c.sourceLabel === base.sourceLabel).length + 1;
    target.push(Object.assign({}, base, {
      id: base.id + (suffix > 1 ? '-' + suffix : ''),
      text
    }));
  }
}

/* ---------- chapter metadata ---------- */
function chapterList(chapters) {
  return chapters.map(c => ({
    id: Number(c.id),
    title: clean(c.en),
    titleHi: clean(c.hi || '')
  }));
}

/* ---------- 1. textbook sections, activities, summaries ---------- */
function textbookChunks({ chapters, extract }) {
  const chunks = [];
  const extractByChapter = new Map();
  for (const entry of extract || []) {
    if (!entry || !Array.isArray(entry.pages)) continue;
    extractByChapter.set(Number(entry.chapter), { pages: entry.pages.map(p => ({ page: Number(p.page), text: String(p.text || '') })), scanned: !!entry.scanned });
  }
  let seq = 0;
  for (const chapter of chapters) {
    const ch = Number(chapter.id);
    const title = clean(chapter.en);
    const map = extractByChapter.get(ch);
    const findPage = map ? pageFinder(map.pages) : () => null;
    const source = `NCERT Class 10 Science · Ch ${ch} · ${title}`;

    for (const section of chapter.sections || []) {
      const body = clean(section.text);
      if (body.length < 40) continue;
      const sectionLabel = section.n && section.n !== '0' ? `${section.n} ${clean(section.title)}` : clean(section.title) || 'Introduction';
      const page = findPage(body);
      seq += 1;
      pushProse(chunks, {
        id: `tb-c${ch}-${String(seq).padStart(4, '0')}`,
        docType: 'textbook',
        source,
        sourceLabel: `NCERT · Ch ${ch} · ${sectionLabel}`,
        chapter: ch,
        chapterTitle: title,
        section: sectionLabel,
        sectionNo: section.n || '',
        page,
        pageSource: page ? 'textbook-pdf' : ''
      }, body);
    }

    for (const activity of chapter.activities || []) {
      const body = clean(activity.text);
      if (body.length < 40) continue;
      const sectionLabel = `Activity ${clean(activity.n)}`;
      const page = findPage(body);
      seq += 1;
      pushProse(chunks, {
        id: `act-c${ch}-${String(seq).padStart(4, '0')}`,
        docType: 'activity',
        source,
        sourceLabel: `NCERT · Ch ${ch} · Activity ${clean(activity.n)}`,
        chapter: ch,
        chapterTitle: title,
        section: sectionLabel,
        sectionNo: clean(activity.n),
        page,
        pageSource: page ? 'textbook-pdf' : ''
      }, body);
    }

    if (chapter.summary && clean(chapter.summary).length >= 80) {
      const body = clean(chapter.summary);
      const page = findPage(body);
      seq += 1;
      pushProse(chunks, {
        id: `sum-c${ch}-${String(seq).padStart(4, '0')}`,
        docType: 'summary',
        source,
        sourceLabel: `NCERT · Ch ${ch} · Summary`,
        chapter: ch,
        chapterTitle: title,
        section: 'What you have learnt',
        sectionNo: '',
        page,
        pageSource: page ? 'textbook-pdf' : ''
      }, body);
    }
  }
  return chunks;
}

/* ---------- 2. NCERT exercises with verified answers ---------- */
function exerciseChunks({ exercise, chapters }) {
  const titles = new Map(chapters.map(c => [Number(c.id), clean(c.en)]));
  const out = [];
  for (const q of exercise) {
    const text = clean(q.en);
    if (!text) continue;
    const ch = Number(q.ch) || 0;
    const title = titles.get(ch) || clean(q.chapter);
    const options = Array.isArray(q.opts) ? q.opts.map(o => clean(o && (o.en || o.text || ''))).filter(Boolean) : [];
    const verified = q.keyVerified === true && String(q.ans == null ? '' : q.ans).trim() !== '';
    const body = [
      text,
      options.length ? 'Options: ' + options.map((o, i) => `(${String.fromCharCode(97 + i)}) ${o}`).join('  ') : '',
      verified ? 'NCERT answer: ' + clean(q.ans) : ''
    ].filter(Boolean).join('\n');
    out.push({
      id: `ex-${String(q.id || '').replace(/[^A-Za-z0-9-]/g, '') || 'q'}`,
      docType: 'exercise',
      source: `NCERT Class 10 Science · Ch ${ch} · Exercise`,
      sourceLabel: `NCERT Ch ${ch} · Exercise Q${q.qno || q.q || ''}`.trim(),
      chapter: ch,
      chapterTitle: title,
      section: 'Exercise',
      sectionNo: String(q.qno || q.q || ''),
      exerciseNo: Number(q.qno || q.q) || null,
      marks: Number(q.m) || null,
      question: text,
      options,
      answer: verified ? clean(q.ans) : '',
      verifiedKey: verified,
      page: null,
      pageSource: '',
      text: body
    });
  }
  return out;
}

/* ---------- 3. CBSE board questions (PYQ) ---------- */
function pyqChunks({ pyq, ocr, chapters }) {
  const titles = new Map(chapters.map(c => [Number(c.id), clean(c.en)]));
  const finderByFile = new Map();
  const out = [];
  const seenExercise = new Set();
  for (const q of pyq) {
    const text = clean(q.en);
    if (!text) continue;
    // pyq-science.js repeats the NCERT exercise rows (no year, id sci10-…).
    // They are already indexed from science10-q.js with their verified answer.
    if (!q.y) { seenExercise.add(q.id); continue; }
    const ch = Number(q.ch) || 0;
    const title = titles.get(ch) || '';
    const options = Array.isArray(q.opts) ? q.opts.map(o => clean(o && (o.en || o.text || ''))).filter(Boolean) : [];
    const letter = String(q.ans == null ? '' : q.ans).trim();
    const verified = q.keyVerified === true && /^[A-D]$/.test(letter) && options.length === 4;
    const answerText = verified ? options[letter.charCodeAt(0) - 65] : '';
    const paper = String(q.src || '').trim();
    let findPage = finderByFile.get(paper);
    if (!findPage && ocr && ocr[paper]) {
      const pages = Object.keys(ocr[paper]).map(k => ({ page: Number(k) + 1, text: String(ocr[paper][k] || '') }));
      findPage = pageFinder(pages);
      finderByFile.set(paper, findPage);
    }
    if (!findPage) findPage = () => null;
    const page = findPage(text);
    const set = clean(q.set || '');
    const sourceLabel = `CBSE ${q.y}${set ? ' · Set ' + set : ''} · Q ${q.q || ''}`.replace(/\s+/g, ' ').trim();
    const body = [
      text,
      options.length ? 'Options: ' + options.map((o, i) => `(${String.fromCharCode(65 + i)}) ${o}`).join('  ') : '',
      verified ? 'Answer key (verified): ' + letter + ' — ' + answerText : ''
    ].filter(Boolean).join('\n');
    out.push({
      id: `pyq-${String(q.id || '').replace(/[^A-Za-z0-9-]/g, '')}`,
      docType: 'pyq',
      source: `CBSE ${q.y} Class 10 Science · ${paper}`,
      sourceLabel,
      chapter: ch,
      chapterTitle: title,
      section: clean(q.kind || 'question'),
      sectionNo: String(q.q || ''),
      year: Number(q.y) || null,
      set,
      paper,
      questionNo: Number(q.q) || null,
      marks: Number(q.m) || null,
      level: clean(q.lv || ''),
      question: text,
      options,
      answer: answerText,
      verifiedKey: verified,
      page,
      pageSource: page ? 'pyq-ocr' : '',
      text: body.length > MAX_PYQ_CHARS ? body.slice(0, MAX_PYQ_CHARS - 1).trim() + '…' : body
    });
  }
  return { chunks: out, skippedExerciseDuplicates: seenExercise.size };
}

/* ---------- build ---------- */
function build() {
  const { chapters, exercise, pyq } = loadData();
  const extract = JSON.parse(read('assets/science/_extract.json'));
  const ocr = JSON.parse(read('assets/science/_pyq-ocr.json'));
  const textbook = textbookChunks({ chapters, extract });
  const exercises = exerciseChunks({ exercise, chapters });
  const board = pyqChunks({ pyq, ocr, chapters });
  const chunks = textbook.concat(exercises, board.chunks);

  const ids = new Set();
  for (const chunk of chunks) {
    if (ids.has(chunk.id)) throw new Error('duplicate chunk id: ' + chunk.id);
    ids.add(chunk.id);
    if (!chunk.text || chunk.text.length < 24) throw new Error('empty chunk text: ' + chunk.id);
    if (!(chunk.chapter >= 1 && chunk.chapter <= 13)) throw new Error('chapter out of range: ' + chunk.id);
    if (chunk.page != null && !(chunk.page >= 1)) throw new Error('bad page: ' + chunk.id);
  }
  const byType = { textbook: 0, activity: 0, summary: 0, exercise: 0, pyq: 0 };
  for (const chunk of chunks) byType[chunk.docType] = (byType[chunk.docType] || 0) + 1;

  return {
    version: 1,
    purpose: 'Class 10 Science retrieval index for the cited tutor. Generated from the app data; do not hand-edit.',
    builtFrom: SOURCE_FILES.map(rel => ({ path: rel, sha256: sha256(read(rel)), bytes: fs.statSync(file(rel)).size })),
    counts: {
      chunks: chunks.length,
      ...byType,
      withPage: chunks.filter(c => c.page).length,
      verifiedAnswers: chunks.filter(c => c.verifiedKey).length,
      skippedExerciseDuplicates: board.skippedExerciseDuplicates
    },
    chapters: chapterList(chapters),
    chunks
  };
}

function serialise(payload) {
  // One chunk per line keeps the diff reviewable without repeating the whole
  // file when a single question changes.
  const head = {
    version: payload.version,
    purpose: payload.purpose,
    builtFrom: payload.builtFrom,
    counts: payload.counts,
    chapters: payload.chapters
  };
  const headText = JSON.stringify(head, null, 2);
  const body = payload.chunks.map(c => JSON.stringify(c)).join(',\n');
  return headText.slice(0, -2) + ',\n  "chunks": [\n' + body + '\n  ]\n}\n';
}

function main() {
  const check = process.argv.includes('--check');
  const payload = build();
  const text = serialise(payload);
  if (check) {
    if (!fs.existsSync(OUT)) { console.error('FAIL science index is missing: assets/science/science-index.json'); process.exit(1); }
    const committed = fs.readFileSync(OUT, 'utf8');
    if (committed !== text) {
      console.error('FAIL science-index.json is out of date. Run: node tools/science-index/build_science_index.js');
      process.exit(1);
    }
    console.log(`PASS science index is up to date: ${payload.counts.chunks} chunks, ${payload.counts.withPage} page-grounded, ${payload.counts.verifiedAnswers} verified answers`);
    return;
  }
  fs.writeFileSync(OUT, text);
  console.log(`Wrote ${path.relative(ROOT, OUT)}: ${payload.counts.chunks} chunks ` +
    `(${payload.counts.textbook} textbook, ${payload.counts.activity} activities, ${payload.counts.summary} summaries, ` +
    `${payload.counts.exercise} exercises, ${payload.counts.pyq} board questions), ` +
    `${payload.counts.withPage} page-grounded, ${payload.counts.verifiedAnswers} verified answers, ` +
    `${(Buffer.byteLength(text) / 1024).toFixed(0)} KB`);
}

if (require.main === module) main();
module.exports = { build, serialise, clean, alnum };
