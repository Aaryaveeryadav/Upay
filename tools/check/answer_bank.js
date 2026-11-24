'use strict';
/* The answer bank: every question the site already carries must be answerable
   without the model, and a question it does NOT carry must not be given
   somebody else's answer.

   This is the regression for the bug a student saw: "Why are bags of chips
   flushed with nitrogen gas?" has a verified NCERT answer in the data, yet the
   page said "no draft answer this time" because the model was offline. The
   three properties below are what must keep holding:

     1. The data's own questions return the book's answer, with citations, in a
        process where the model is switched OFF (UPAY_LOCAL_LLM=off).
     2. A deliberately unrelated question is refused as off-syllabus.
     3. A paraphrase is NOT answered with a different exercise's key.
*/
const assert = require('node:assert/strict');
process.env.UPAY_LOCAL_LLM = 'off';

const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const chat = require(path.join(root, 'lib', 'chat.js'));
const store = require(path.join(root, 'lib', 'answer-store.js'));

const groups = [];
async function group(name, fn) {
  try { await fn(); console.log('PASS ' + name); }
  catch (e) { groups.push(name); console.error('FAIL ' + name + ': ' + (e && e.message || e)); }
}

(async () => {
  await group('the data\'s own questions answer from the book, model off', async () => {
    const cases = [
      ['Oil and fat containing food items are flushed with nitrogen. Why?', 'ex-sci10-01-q19'],
      ['What is a balanced chemical equation? Why should chemical equations be balanced?', 'ex-sci10-01-q04']
    ];
    for (const [question, id] of cases) {
      const result = await chat.answer({ question, class: 10, subject: 'science' });
      assert.equal(result.ok, true, question);
      assert.equal(result.grounded, true, question);
      assert.equal(result.answerId, id, question);
      assert.equal(result.keyed, true, 'a verified key is labelled as such');
      assert(result.answer.length > 40, 'the key has real text');
      assert(result.citations.length > 0, 'the sources travel with the key');
      assert(!result.model, 'no model was needed');
      assert.match(result.notice, /answer key printed with the question|own answer key|stored/i);
    }
  });

  await group('every verified key in the bank is usable', async () => {
    const stats = store.stats();
    assert(stats.total > 0, 'the bank has answers');
    assert((stats.byStatus.verified || 0) > 150, 'the built-in keys are all imported');
    for (const entry of Object.values(store.load().entries)) {
      // A one-mark exercise's key can be a single value ("10", "HCl"); what
      // must never be empty is the excerpt that shows where it came from.
      assert(entry.a && String(entry.a).trim().length > 0, 'answer text for ' + entry.id);
      assert(Array.isArray(entry.sources) && entry.sources.length > 0, 'sources for ' + entry.id);
      assert(String(entry.sources[0].text || '').length > 20, 'source excerpt for ' + entry.id);
      assert(/^\d+:[a-z-]+$/.test(entry.scope), 'scope for ' + entry.id);
    }
  });

  await group('an off-syllabus question is refused, not answered', async () => {
    const result = await chat.answer({ question: 'What is the capital of France?', class: 10, subject: 'science' });
    assert.equal(result.onTopic, false);
    assert.equal(result.code, 'off_topic');
    assert.equal(result.citations.length, 0);
    assert.match(result.answer, /syllabus|outside/i);
  });

  await group('a paraphrase is not given a different exercise\'s key', async () => {
    const cases = [
      'Why are bags of chips flushed with nitrogen gas?',
      'Why is a convex mirror used as a rear-view mirror?',
      'Balance the chemical equation: N2 + H2 -> NH3'
    ];
    for (const question of cases) {
      let result = null;
      try { result = await chat.answer({ question, class: 10, subject: 'science' }); }
      catch (e) {
        // With the model switched off, an un-stored question must fail with an
        // honest model-off code instead of borrowing an answer.
        assert(['llm_disabled', 'llm_unavailable'].includes(e.code), 'unexpected error ' + e.code + ' for ' + question);
        continue;
      }
      assert.equal(result.keyed, undefined, 'no book key was borrowed for: ' + question);
      assert.equal(result.stored, undefined, 'no stored answer was borrowed for: ' + question);
    }
  });

  if (groups.length) { console.error('\n' + groups.length + ' answer-bank group(s) failed'); process.exit(1); }
  console.log('\nPASS answer bank: keys served offline, off-syllabus refused, no borrowed answers');
})();
