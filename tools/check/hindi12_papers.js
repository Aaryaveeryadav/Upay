'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {papers}=JSON.parse(fs.readFileSync('assets/papers/hindi-core/questions.json'));
const ids=[1,2,3,4,5,7].flatMap(series=>[1,2,3].map(set=>`2-${series}-${set}`));
assert.deepEqual(papers.map(p=>p.id),ids);
for(const paper of papers){
  const {id,questions}=paper;
  assert.equal(paper.subject,'hindi-core');assert.equal(paper.board,'cbse');assert.equal(paper.cls,12);assert.equal(paper.status,'unverified-ocr');
  assert.equal(paper.pdf,`/assets/papers/hindi-core/${id}.pdf`);assert.equal(crypto.createHash('sha256').update(fs.readFileSync('.'+paper.pdf)).digest('hex'),paper.sha256);
  assert.deepEqual(questions.map(q=>q.number),Array.from({length:12},(_,i)=>i+1));
  assert.equal(questions.reduce((a,q)=>a+Number(q.printedMarks.split('=').pop()),0),paper.maxMarks);
  for(const [i,q] of questions.entries()){
    assert(q.needsReview);assert(q.parts.length);assert.equal(q.parts[0].page,q.startPage);
    assert(!('answer' in q||'key' in q||'year' in q));assert(q.parts.some(s=>/[ऀ-ॿ]/.test(s.text)));
    for(const part of q.parts){assert(part.page>=q.startPage && part.page<=(questions[i+1]?.startPage||paper.pageCount));assert(part.text.trim());}
  }
}
assert.equal(papers.reduce((n,p)=>n+p.pageCount,0),228);
console.log('PASS Hindi Core: 18 distinct source PDFs, 216 numbered questions, printed totals, OCR review flags and PDF-page references');
