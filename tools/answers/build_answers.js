#!/usr/bin/env node
'use strict';
/* Build the answers the site serves instantly: ONE correct answer for every
   question in the app's own data.
 *
 *     node tools/answers/build_answers.js                 # build what is missing
 *     node tools/answers/build_answers.js --scope 10:science
 *     node tools/answers/build_answers.js --limit 25 --dry-run
 *     node tools/answers/build_answers.js --refresh       # re-draft stored ones
 *
 * This is the operator's job, not the student's. It needs the site's own model
 * (the GPU box running Ollama) reachable from UPAY_LOCAL_LLM_URL. It does NOT
 * invent anything: each answer is built from that question's own retrieved
 * sources through lib/local-llm.js, the same boundary the live chat uses, and
 * is stored by lib/answer-store.js. A question with a built-in NCERT answer key
 * is stored as-is ('verified'), never overwritten by a model draft.
 *
 * It is resumable and safe to run repeatedly:
 *   - the store is written after every answer, so Ctrl-C loses at most one;
 *   - an unchanged question is skipped;
 *   - a changed question keeps its old answer unless --refresh is passed.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const store = require(path.join(root, 'lib', 'answer-store.js'));
const chat = require(path.join(root, 'lib', 'chat.js'));
const subjectIndex = require(path.join(root, 'lib', 'subject-index.js'));

function arg(name, fallback) {
  const at = process.argv.indexOf('--' + name);
  return at >= 0 && process.argv[at + 1] && !process.argv[at + 1].startsWith('--') ? process.argv[at + 1] : fallback;
}
const has = name => process.argv.includes('--' + name);

/* Every question row the data already carries, per class+subject. */
/* The Science index holds only Class 10 Science; the other packs declare
   themselves in lib/subject-index.js. Each scope is read through the same
   module the live chat uses, so the builder cannot see questions a student
   will never be served. */
const SCIENCE_SCOPES = [{ key: '10:science', class: 10, subject: 'science' }];

function collectRows(scopeFilter) {
  const out = [];
  const available = chat.status().subjects || {};
  for (const [key, info] of Object.entries(available)) {
    if (scopeFilter && key !== scopeFilter) continue;
    const cls = info.class, subject = info.subject;
    let rows = subjectIndex.chapterRows(cls, subject)
      .filter(r => (r.docType === 'pyq' || r.docType === 'exercise') && String(r.question || r.text || '').trim())
      .map(r => ({ ...r, class: cls, subject }));
    for (const row of rows) out.push(row);
  }
  for (const scope of SCIENCE_SCOPES) {
    if (scopeFilter && scopeFilter !== scope.key) continue;
    if (available[scope.key] && !available[scope.key].chunks) continue;
    const science = subjectIndex.scienceRows ? subjectIndex.scienceRows() : null;
    const chunks = science || require(path.join(root, 'lib', 'science-rag.js')).loadIndex().chunks;
    for (const c of chunks) {
      if (c.docType !== 'pyq' && c.docType !== 'exercise') continue;
      const question = String(c.question || c.text || '').trim();
      if (!question) continue;
      out.push({
        id: c.id, docType: c.docType, label: c.sourceLabel || c.source, text: c.text,
        question, chapter: c.chapter, chapterTitle: c.chapterTitle, section: c.section,
        page: c.page, pageSource: c.pageSource, answer: c.verifiedKey ? c.answer : '',
        verifiedKey: !!c.verifiedKey, class: scope.class, subject: scope.subject
      });
    }
  }
  return out;
}

function sourceFor(row) {
  return {
    id: row.id, docType: row.docType, label: row.label || row.sourceLabel || '',
    chapter: row.chapter, chapterTitle: row.chapterTitle || '', section: row.section || '',
    page: row.page || null, pageSource: row.pageSource || '',
    verifiedKey: !!row.verifiedKey, answer: row.answer || '',
    question: row.question || '',
    // The excerpt the answer is built from: the question itself plus the
    // chapter passage it belongs to. Keeping the text here means a later data
    // change is detected by hash instead of silently serving a stale answer.
    text: String(row.text || row.question || '').slice(0, 1200)
  };
}

async function main() {
  const scopeFilter = arg('scope', '');
  const limit = Number(arg('limit', '0')) || 0;
  const dry = has('dry-run');
  const refresh = has('refresh');
  // Store only what the data itself answers (real NCERT keys). This needs no
  // model and is the safe minimum for a deployment without a GPU yet.
  const verifiedOnly = has('verified-only');

  const rows = collectRows(scopeFilter).filter(r => r.question && String(r.question).trim().length >= 8);
  if (!rows.length) {
    console.error('build-answers: no questions found' + (scopeFilter ? ' for ' + scopeFilter : ''));
    process.exit(1);
  }
  const status = chat.status();
  console.log(`${rows.length} question(s) in the data${scopeFilter ? ' for ' + scopeFilter : ''}`);
  console.log('model: ' + (status.enabled ? status.model + ' at ' + (process.env.UPAY_LOCAL_LLM_URL || 'http://127.0.0.1:11434') : 'switched off'));

  let built = 0, skipped = 0, failed = 0, verified = 0;
  for (const row of rows) {
    if (limit && built >= limit) break;
    const sources = [sourceFor(row)];
    const hash = store.hashQuestion(row.question, sources);
    const existing = store.get(row.id);
    if (existing && existing.hash === hash && !refresh) { skipped++; continue; }

    // A built-in answer key is the best answer there is: store it verbatim.
    if (row.verifiedKey && row.answer) {
      if (!dry) store.put({
        id: row.id, scope: store.scopeKey(row.class, row.subject), q: String(row.question).trim(),
        a: String(row.answer).trim(), status: 'verified', model: 'data', hash,
        sources, savedAt: new Date().toISOString()
      }, { replace: true });
      verified++; built++;
      continue;
    }
    if (verifiedOnly) { skipped++; continue; }

    if (dry) { console.log('  would draft: ' + row.id + '  ' + String(row.question).slice(0, 72)); built++; continue; }

    // Answer from this question's OWN retrieved sources, so the stored text
    // cites real pages rather than the question row quoting itself.
    let result;
    try {
      result = await chat.answer({
        question: row.question, class: row.class, subject: row.subject,
        chapter: row.chapter || undefined, limit: 2, fresh: true
      });
    } catch (e) {
      failed++;
      console.error(`  ! ${row.id}: ${e.code || e.message}`);
      if (e.code === 'llm_unavailable' || e.code === 'llm_configuration' || e.code === 'llm_disabled') {
        console.error('\nThe model is not reachable, so no answers were drafted. Start the GPU model' +
          ' (UPAY_LOCAL_LLM_URL) and run this again: it resumes where it stopped.');
        store.save(store.load());
        process.exit(failed && !built ? 2 : 1);
      }
      continue;
    }
    if (!result || !result.grounded || !String(result.answer || '').trim()) { skipped++; continue; }
    const kept = (result.citations || []).map(c => ({
      id: c.id, docType: c.docType, label: c.label, chapter: c.chapter, chapterTitle: c.chapterTitle,
      section: c.section, page: c.page, pageSource: c.pageSource, verifiedKey: c.verifiedKey,
      answer: c.answer, question: c.question, text: c.snippet
    }));
    store.put({
      id: row.id, scope: store.scopeKey(row.class, row.subject), q: String(row.question).trim(),
      a: String(result.answer).trim(), status: result.stored ? result.status : 'drafted',
      model: result.model || status.model, hash, sources: kept.length ? kept : sources,
      savedAt: new Date().toISOString()
    });
    built++;
    if (built % 10 === 0) {
      store.save(store.load());
      console.log(`  ... ${built} built (${skipped} skipped, ${failed} failed)`);
    }
  }
  if (!dry) { store.load().builtAt = new Date().toISOString(); store.save(store.load()); }
  const s = store.stats();
  console.log(`\nBuilt ${built} (${verified} from verified keys). Skipped ${skipped} unchanged/ungrounded, ${failed} failed.`);
  console.log('Stored answers: ' + s.total + '  ' + JSON.stringify(s.byStatus));
  if (s.byStatus) console.log('By scope: ' + JSON.stringify(s.byScope));
  console.log('File: ' + path.relative(root, store.STORE));
  if (failed) console.log('\nRe-run to retry the failed questions; completed answers are kept.');
}

main().catch(e => { console.error('build-answers: ' + (e && e.message || e)); process.exit(1); });
