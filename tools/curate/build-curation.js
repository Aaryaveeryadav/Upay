#!/usr/bin/env node
/**
 * Build the question-bank curation layer.
 *
 * The question bank lives in ~30 hand-authored JS files. Rewriting them in
 * place would be risky and hard to review, so this tool computes a sidecar of
 * corrections instead, written to assets/js/data/question-overrides.js:
 *
 *   excluded[reason]  records that hold no question at all (blank text, or a
 *                     table/figure cell that the PDF extractor promoted)
 *   duplicates        records identical to an earlier record in the same paper
 *   renames           records whose id collides with another record's id
 *   patched           print debris stripped out of en/hi text
 *
 * boot.js applies the sidecar after every pack has loaded. Nothing is removed
 * from the source files, so the whole change stays reversible and reviewable.
 *
 * Usage:
 *   node tools/curate/build-curation.js            # audit only
 *   node tools/curate/build-curation.js --write    # regenerate the sidecar
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'assets/js/data/question-overrides.js');
const questionQuality = require(path.join(ROOT, 'assets/js/question-quality.js'));
const questionFold = require(path.join(ROOT, 'assets/js/question-fold.js'));

/* ---------------------------------------------------------------- loading */

// Boot order matters: REPLACE_PACKS (see boot.js) resets UP.pyq per subject.
const CORE = [
  'assets/js/data-extra.js',
  'assets/js/data/chapters1.js',
  'assets/js/data/chapters2.js',
  'assets/js/data/pyq.js',
  'assets/js/data/pyq-2024.js',
  'assets/js/data/pyq-keys.js',
  'assets/js/data/chapters12-maths.js',
  'assets/js/data/chapters12-applied-maths.js',
  'assets/js/data/chapters12-accountancy.js',
  'assets/js/data/economics12.js',
  'assets/js/data/economics-sources.js',
  'assets/js/data/english12.js',
  'assets/js/data/english12-sources.js',
  'assets/js/data/class12-original-test-papers.js',
  'assets/js/data/pyq-cbse2025-cls12.js',
  'assets/js/data/pyq-accountancy-2023-2026-extracted.js',
  'assets/js/data/accountancy-original-papers.js',
  'assets/js/data/mcq-keyed.js',
];

const PACKS = [
  ['assets/science/science10.js', 'assets/science/hindi10-ch.js',
   'assets/js/data/science10-q.js', 'assets/js/data/pyq-science.js'],
  ['assets/js/data/social-chapters.js', 'assets/js/data/social10-q.js',
   'assets/js/data/pyq-social.js'],
  ['assets/js/data/hindi-extra.js', 'assets/js/data/hindi10-q.js',
   'assets/js/data/hindi10-rich.js', 'assets/js/data/pyq-hindi-final.js',
   'assets/js/data/pyq-hindi-a5b4.js', 'assets/js/data/pyq-hindi-a6b5.js'],
  ['assets/js/data/english10-ff.js', 'assets/js/data/english10-fp.js',
   'assets/js/data/english10.js', 'assets/js/data/pyq-english.js'],
  ['assets/sanskrit/sanskrit10-ch.js', 'assets/sanskrit/sanskrit10-rich.js',
   'assets/sanskrit/sanskrit10-q.js', 'assets/sanskrit/sanskrit-papers.js'],
  ['assets/js/data/physics12.js', 'assets/js/data/pyq-physics-2025.js'],
  ['assets/js/data/chemistry12.js', 'assets/js/data/pyq-chemistry-2022.js',
   'assets/js/data/pyq-chemistry-2023.js', 'assets/js/data/pyq-chemistry-2025.js'],
  ['assets/js/data/rbse-chapters.js', 'assets/js/data/rbse.js'],
];

function loadBank() {
  const ctx = { window: {}, console, setTimeout: () => 0 };
  ctx.window = ctx;
  ctx.document = {};
  ctx.self = ctx;
  vm.createContext(ctx);
  const run = rel => {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) return;
    try { vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: rel }); }
    catch (e) { console.error('load failed:', rel, e.message); }
  };
  CORE.forEach(run);
  PACKS.forEach(p => p.forEach(run));
  const synthesizedIds = questionFold.foldLiteratureQuestions(ctx.UP || {});
  return { bank: ctx.UP.pyq || [], synthesizedIds };
}

/* ---------------------------------------------------------------- cleaning */

// Print debris that survived the original imports. Every pattern here is known
// junk from the NCERT/board PDFs and is never part of a question.
const DEBRIS = [
  /\s*Reprint\s+20\d\d[-\u2013]\d\d\s*/gi,
  /\s*Rationalised\s+20\d\d[-\u2013]\d\d\s*/gi,
  /\s*NOT TO BE REPUBLISHED\s*/gi,
  /\s*Chap\s*\d*\.?\s*indd[^\n]*/gi,
  /\s*\u00a9\s*NCERT\s*/gi,
  /\s*EXEMPLAR PROBLEMS\s*/gi,
  /\s*\bReprint\b\s*/gi,
  // running head glued to the end of a stem: "226 Chemistry", "Physics 106"
  /\s*\b\d{2,3}\s+(?:Chemistry|Physics|Mathematics|Biology|Accountancy|Economics)\s*$/g,
  /\s*\b(?:Chemistry|Physics|Mathematics|Biology|Accountancy|Economics)\s+\d{1,3}\s*$/g,
];

function hasDebris(text) {
  const t = String(text == null ? '' : text);
  return DEBRIS.some(re => { re.lastIndex = 0; return re.test(t); });
}

// Remove print debris and tidy the spacing that removal leaves behind. Only
// whitespace is collapsed where debris was actually found, so ordinary text is
// never rewritten.
function stripDebris(text) {
  const t = String(text == null ? '' : text);
  if (!hasDebris(t)) return t.trim();
  let out = t;
  for (const re of DEBRIS) { re.lastIndex = 0; out = out.replace(re, ' '); }
  return out.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
}

function norm(text) {
  return String(text == null ? '' : text)
    .normalize('NFKC').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// A duplicate must match in BOTH languages. Pack pairs such as `bd10` / `bd10b`
// are the two "OR" alternatives of one question: they share the Hindi field and
// the answer but hold different English parts, so they are not duplicates.
function compareText(q) {
  return norm(q.en) + '\u0000' + norm(q.hi) + '\u0000' + norm(q.sa);
}

function displayText(q) {
  return (stripDebris(q.en) || stripDebris(q.hi) || stripDebris(q.sa)).slice(0, 88);
}

/* ------------------------------------------------------------ classification */

// A record is only "no question at all" if it carries no interrogative signal.
const QUESTION_SIGNAL = /\b(define|explain|describe|calculate|compute|find|prove|why|how|what|which|state|write|give|name|mention|differentiate|distinguish|compare|derive|show|solve|evaluate|identify|choose|select|complete|list|discuss|justify|assertion|reason|match|read|answer|attempt|examine|observe|draw|label|comment|analyse|analyze|predict|interpret|verify|check|express|represent|construct|locate|trace|fill|true or false|correct option|given below|following)\b/i;

function classify(q) {
  const body = stripDebris(q.en) || stripDebris(q.hi) || stripDebris(q.sa);

  // Nothing to show at all.
  if (!body) return 'blank';
  if (body.length < 4) return 'blank';

  // Activities, paper-level directions, generic prompts without a topic, and
  // obvious Hindi OCR noise are not standalone questions. Keep source text
  // untouched; the sidecar only withholds the defective record.
  const qualityIssue = questionQuality.inspect(q, q.subject);
  if (qualityIssue) return qualityIssue;

  // Many records keep their options inline in the stem, e.g.
  // "... is : (A) 12 (B) 120 (C) 1200 (D) 40". Those are real MCQs.
  const hasInlineOptions = /\(\s*[a-dA-D]\s*\)/.test(body);
  const hasOptions = (Array.isArray(q.opts) && q.opts.length > 0) || hasInlineOptions;
  const hasSignal = QUESTION_SIGNAL.test(body) || /\?/.test(body);

  // A record that reads like a question but lost its options to a truncation is
  // a known limitation, not junk. Keep it.
  if (!hasOptions && (/\?/.test(body) || /\b(which of the following|choose|select)\b/i.test(body))) {
    return null;
  }

  // Table/figure cells are short noun phrases ending in a table value, with no
  // question signal and no options: "Handloom weaver working in his/her house 70".
  // A trailing 1-6 is usually a marks column ("... are : 1"), so require 7+.
  const m = body.match(/\s(\d{1,4})\s*$/);
  if (m && !hasOptions && !hasSignal && body.length < 75 && Number(m[1]) >= 7) {
    return 'table-artefact';
  }

  // A stem reduced to a bare label.
  if (!hasOptions && !hasSignal && /^(Options\s*:?|Ans\.?|Solution)\s*$/i.test(body)) {
    return 'dangling-label';
  }

  return null;
}

/* ------------------------------------------------------------------- build */

function build() {
  const loaded = loadBank();
  const bank = loaded.bank;
  const synthesizedIds = loaded.synthesizedIds;
  const dropped = [];
  const dropReasons = {};
  const duplicates = [];
  const renames = {};
  const patched = {};
  const seenId = new Map();
  const seenExact = new Map();
  const kept = [];

  for (const q of bank) {
    if (!q || typeof q !== 'object') continue;

    const verdict = classify(q);
    if (verdict) {
      dropped.push({ id: q.id, reason: verdict, text: displayText(q) });
      dropReasons[q.id] = verdict;
      continue;
    }

    const fullText = compareText(q);
    const optKey = Array.isArray(q.opts)
      ? q.opts.map(o => norm(o && (o.en || o.hi || o.key))).join('~') : '';
    const exactKey = [q.cls, q.subject, q.src || q.board, q.y || '', q.set || '',
                      fullText, optKey, norm(q.ans)].join('|');

    if (norm(q.en).length + norm(q.hi).length >= 15 && seenExact.has(exactKey)) {
      duplicates.push({ id: q.id, dupeOf: seenExact.get(exactKey), text: displayText(q) });
      continue;
    }

    // The same id can appear twice while holding different content. Re-id the
    // later record rather than losing a real question.
    if (seenId.has(q.id)) {
      const seen = seenId.get(q.id) + 1;
      seenId.set(q.id, seen);
      let n = seen;
      let fresh = `${q.id}-d${n}`;
      while (seenId.has(fresh)) { n += 1; fresh = `${q.id}-d${n}`; }
      (renames[q.id] = renames[q.id] || []).push(fresh);
      seenId.set(fresh, 1);
      q.id = fresh;
    } else {
      seenId.set(q.id, 1);
    }

    seenExact.set(exactKey, q.id);

    // Non-destructive text repairs: remove print debris and, when a clean
    // question precedes an explicit activity label, separate that activity.
    const fixedEn = stripDebris(questionQuality.cleanActivityTail(q.en));
    const fixedHi = stripDebris(questionQuality.cleanActivityTail(q.hi));
    const fixedSa = stripDebris(questionQuality.cleanActivityTail(q.sa));
    const patch = {};
    if (fixedEn !== String(q.en || '')) patch.en = fixedEn;
    if (fixedHi !== String(q.hi || '')) patch.hi = fixedHi;
    if (fixedSa !== String(q.sa || '')) patch.sa = fixedSa;
    if (Object.keys(patch).length) patched[q.id] = patch;

    kept.push(q);
  }

  return { bank, kept, dropped, dropReasons, duplicates, renames, patched, synthesizedIds };
}

/* ------------------------------------------------------------------ output */

function report(res) {
  const { bank, kept, dropped, duplicates, renames, patched, synthesizedIds } = res;
  const byReason = {};
  dropped.forEach(d => { byReason[d.reason] = (byReason[d.reason] || 0) + 1; });
  const removed = dropped.length + duplicates.length;

  console.log(`records loaded        : ${bank.length}`);
  console.log(`folded exercise rows  : ${synthesizedIds.length}`);
  console.log(`records held back     : ${removed} (${(100 * removed / bank.length).toFixed(2)}%)`);
  Object.entries(byReason).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`    ${k.padEnd(18)}${String(v).padStart(5)}`));
  console.log(`    ${'duplicate'.padEnd(18)}${String(duplicates.length).padStart(5)}`);
  console.log(`text repairs          : ${Object.keys(patched).length} records`);
  console.log(`ids given fresh names : ${Object.values(renames).reduce((s, a) => s + a.length, 0)} records`);
  console.log(`kept                  : ${kept.length}`);

  for (const reason of Object.keys(byReason)) {
    console.log(`\n--- ${reason} (${byReason[reason]}) ---`);
    dropped.filter(d => d.reason === reason).slice(0, 6).forEach(d => {
      console.log(`   ${String(d.id).padEnd(18)} ${JSON.stringify(d.text)}`);
    });
  }

  console.log(`\n--- duplicate (${duplicates.length}) ---`);
  duplicates.slice(0, 8).forEach(d => {
    console.log(`   ${String(d.id).padEnd(16)} of ${String(d.dupeOf).padEnd(16)} ${JSON.stringify(d.text)}`);
  });

  console.log('\n--- text repairs: before / after (4) ---');
  Object.keys(patched).slice(0, 4).forEach(id => {
    const q = bank.find(x => x.id === id || String(x.id).startsWith(id + '-d'));
    if (!q) return;
    console.log(`   ${id}`);
    if (patched[id].en !== undefined) {
      console.log(`     before: ${JSON.stringify(String(q.en).slice(0, 80))}`);
      console.log(`     after : ${JSON.stringify(patched[id].en.slice(0, 80))}`);
    }
  });
}

function payloadFor(res) {
  const { dropped, dropReasons, duplicates, renames, patched, synthesizedIds } = res;
  return {
    version: 1,
    note: 'Generated by tools/curate/build-curation.js. Applied by boot.js after every ' +
          'question pack loads. Source data files are never modified.',
    drop: dropped.map(d => d.id),
    dropReasons,
    duplicates: duplicates.map(d => d.id),
    renames,
    patched,
    foldedExerciseIds: synthesizedIds,
  };
}

function write(res) {
  const payload = Object.assign({ generated: new Date().toISOString() }, payloadFor(res));
  const body = JSON.stringify(payload);
  fs.writeFileSync(OUT,
    '/* GENERATED by tools/curate/build-curation.js - do not edit by hand.\n' +
    '   Question-bank curation sidecar, applied at boot. Re-run the tool instead. */\n' +
    'window.UP = window.UP || {};\n' +
    'UP.questionOverrides = ' + body + ';\n');
  console.log(`\nwrote ${path.relative(ROOT, OUT)} (${(body.length / 1024).toFixed(1)} KB)`);
}

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort()
    .map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
  return JSON.stringify(value);
}

function check(res) {
  try {
    const source = fs.readFileSync(OUT, 'utf8');
    const match = source.match(/UP\.questionOverrides\s*=\s*(\{[\s\S]*\});?\s*$/);
    if (!match) throw new Error('generated sidecar assignment not found');
    const actual = JSON.parse(match[1]);
    const expected = payloadFor(res);
    const stale = Object.keys(expected).filter(key => stable(actual[key]) !== stable(expected[key]));
    if (stale.length) {
      console.error('curation sidecar is stale; rerun with --write (fields: ' + stale.join(', ') + ')');
      process.exitCode = 1;
    } else {
      console.log('curation sidecar matches the current bank and runtime-folded exercises');
    }
  } catch (error) {
    console.error('curation sidecar check failed: ' + error.message);
    process.exitCode = 1;
  }
}

const res = build();
report(res);
if (process.argv.includes('--write') && process.argv.includes('--check')) {
  console.error('choose either --write or --check');
  process.exitCode = 1;
} else if (process.argv.includes('--write')) write(res);
else if (process.argv.includes('--check')) check(res);
