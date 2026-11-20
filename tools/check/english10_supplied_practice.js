'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
global.window = global; global.UP = {};
require('../../assets/js/data/english10-ff.js');
require('../../assets/js/data/english10-fp.js');
require('../../assets/js/data/english10-supplied-practice.js');
const quality = require('../../assets/js/question-quality.js');
const rows = UP.pyq, ids = new Set();
const chapters = new Set([...UP.english10FF,...UP.english10FP].map(c=>c.id));
assert.equal(rows.length,33); assert.equal(UP.english10SuppliedPapers.length,20);
for (const p of UP.english10SuppliedPapers) {
  assert.match(p.url,/^\/assets\/papers\/english10\/[a-z0-9-]+\.pdf$/);
  assert(fs.existsSync(path.join(__dirname,'../..',p.url.slice(1))));
}
for (const q of rows) {
  assert(!ids.has(q.id)); ids.add(q.id);
  assert.equal(q.cls,10); assert.equal(q.subject,'english'); assert.equal(q.board,'cbse');
  assert.equal(q.sourceType,'practice'); assert.equal(q.textReview,'source-verified'); assert.equal(q.keyVerified,false);
  assert(q.q && q.sourcePage && q.chapter && q.en && q.sourceUrl);
  assert(fs.existsSync(path.join(__dirname,'../..',q.sourceUrl.slice(1))));
  assert(!quality.inspect(q,'english'),q.id);
  assert(!quality.testReadyIssue(q),q.id);
  for (const id of q.chapterTags) assert(chapters.has(id),q.id+' has unknown chapter '+id);
  if(q.opts) assert.equal(q.opts.length,4);
}
const cross=rows.find(q=>q.q==='10.B');assert.deepEqual(cross.chapterTags,['eng10-ff07','eng10-ff05']);
console.log('PASS 33 source-linked English practice questions, chapter tags, MCQs, quality gates and 20 supplied PDF files');
